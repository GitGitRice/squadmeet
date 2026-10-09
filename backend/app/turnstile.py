"""Cloudflare Turnstile, the captcha (SCRUM-27).

The browser solves the widget and gets a token. The backend sends the token with the secret key
to Cloudflare, which answers whether it is valid. A token works once and for 5 minutes.

The keys come from the environment: TURNSTILE_SITE_KEY (public, the widget needs it) and
TURNSTILE_SECRET_KEY (secret). Local development and CI use Cloudflare's test keys
(docker-compose.yml); production reads the real keys from AWS SSM (deploy/host-deploy.sh).
"""

import json
import logging
import os
import urllib.parse
import urllib.request
from collections.abc import Callable

from fastapi import HTTPException, Request, status

SITEVERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify"
# Cloudflare's limit for a token.
MAX_TOKEN_LENGTH = 2048
# Cloudflare's documented test secret keys: the first accepts only the test widget's dummy
# token, the second rejects every token. Not secrets.
TEST_SECRET_PASSES = "1x0000000000000000000000000000000AA"
TEST_SECRET_FAILS = "2x0000000000000000000000000000000AA"
# The token that the test site keys give to the browser.
TEST_TOKEN = "XXXX.DUMMY.TOKEN.XXXX"

log = logging.getLogger(__name__)

# (token, client IP) → valid?
Verifier = Callable[[str | None, str | None], bool]


def verify_turnstile(token: str | None, ip: str | None, secret: str | None = None) -> bool:
    """True when Cloudflare accepts the token. False for no token, no key or no answer:
    when Cloudflare cannot be reached, the request fails rather than passes without a check."""
    secret = secret or os.environ.get("TURNSTILE_SECRET_KEY")
    if not secret:
        log.error("TURNSTILE_SECRET_KEY is not set; every captcha fails")
        return False
    if not token or len(token) > MAX_TOKEN_LENGTH:
        return False
    form = {"secret": secret, "response": token} | ({"remoteip": ip} if ip else {})
    request = urllib.request.Request(
        SITEVERIFY_URL, data=urllib.parse.urlencode(form).encode(), method="POST"
    )
    try:
        with urllib.request.urlopen(request, timeout=10) as response:
            result = json.load(response)
    except (OSError, ValueError):
        log.exception("Turnstile siteverify failed")
        return False
    if not result.get("success"):
        log.info("Turnstile token rejected: %s", result.get("error-codes"))
    return bool(result.get("success"))


def turnstile_verifier() -> Verifier:
    """Dependency, so the tests can put a fake in place of the call to Cloudflare."""
    return verify_turnstile


def client_ip(request: Request) -> str | None:
    # Behind Caddy, uvicorn takes the address from X-Forwarded-For (--forwarded-allow-ips).
    return request.client.host if request.client else None


def require_captcha(
    verify: Verifier, token: str | None, request: Request, detail: str
) -> None:
    """400 with `detail` unless the token is valid. Registration uses it, and password reset
    (SCRUM-33) uses it too."""
    if not verify(token, client_ip(request)):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=detail)
