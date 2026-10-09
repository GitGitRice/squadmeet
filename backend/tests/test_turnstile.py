"""The real call to Cloudflare's siteverify, with Cloudflare's documented test keys (SCRUM-27).
These tests need the internet. All other tests use the fake captcha from conftest.py."""

from app.turnstile import TEST_SECRET_FAILS, TEST_SECRET_PASSES, TEST_TOKEN, verify_turnstile


def test_cloudflare_accepts_the_test_token():
    assert verify_turnstile(TEST_TOKEN, "203.0.113.7", secret=TEST_SECRET_PASSES) is True


def test_cloudflare_rejects_with_the_failing_test_key():
    assert verify_turnstile(TEST_TOKEN, None, secret=TEST_SECRET_FAILS) is False


def test_no_token_fails_without_asking_cloudflare():
    assert verify_turnstile(None, None, secret=TEST_SECRET_PASSES) is False
    assert verify_turnstile("x" * 2049, None, secret=TEST_SECRET_PASSES) is False


def test_no_secret_key_fails(monkeypatch):
    monkeypatch.delenv("TURNSTILE_SECRET_KEY", raising=False)

    assert verify_turnstile(TEST_TOKEN, None) is False
