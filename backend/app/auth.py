"""Register, log in, log out (SCRUM-22), MFA with an authenticator app (SCRUM-26),
captcha and rate limits (SCRUM-27). No email address (ADR-0005).

Passwords are hashed with Argon2: people choose weak passwords, so the hash must be slow.
Recovery codes and session tokens are long random values, so a fast SHA-256 hash is enough.
"""

import hashlib
import hmac
import re
import secrets
import os
import time
from datetime import UTC, datetime, timedelta

import pyotp
import segno
from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from pwdlib import PasswordHash
from pydantic import BaseModel, Field, field_validator
from sqlalchemy import delete, func, or_, update
from sqlalchemy.exc import IntegrityError
from sqlmodel import Session, select

from app.db import get_session
from app.models import LoginSession, RecoveryCode, User
from app.rate_limit import RateLimit
from app.turnstile import Verifier, client_ip, require_captcha, turnstile_verifier

# The predefined Avatars. The frontend shows a picture for each key.
AVATARS = (
    "fox", "bear", "owl", "cat", "dog", "panda",
    "frog", "tiger", "koala", "penguin", "rabbit", "lion",
)  # fmt: skip

RECOVERY_CODE_COUNT = 10
# Without 0/O and 1/I/L, so a code copied by hand has no look-alike characters.
RECOVERY_CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"
SESSION_LIFETIME = timedelta(days=30)
MFA_ISSUER = "Squadmeet"
# A code of the step before or after the current one is accepted too (clock drift, slow typing).
MFA_VALID_STEPS = 1
MFA_REQUIRED = "mfa_required"
# From this many failed logins on, login also needs the captcha. The answer without a valid
# captcha token is 401 with this detail; the dialog then shows the widget.
CAPTCHA_AFTER_FAILED_LOGINS = 3
CAPTCHA_REQUIRED = "captcha_required"
CAPTCHA_FAILED = "Bitte bestätige, dass du kein Bot bist."

# Login attempts per IP address, right or wrong. Generous enough for a room of people behind
# one router; a password guesser gets 600 tries per hour instead of thousands per minute.
login_per_ip = RateLimit(limit=10, window_seconds=60)
# Attempts to turn MFA off per user. It asks for password and code, so a stolen session
# token must not become an unlimited guessing machine for both (Stefan's review of SCRUM-26).
mfa_disable_per_user = RateLimit(limit=5, window_seconds=15 * 60)

password_hash = PasswordHash.recommended()
bearer = HTTPBearer(auto_error=False)
router = APIRouter(prefix="/auth", tags=["auth"])


def sha256(value: str) -> str:
    return hashlib.sha256(value.encode()).hexdigest()


def new_recovery_code() -> str:
    # 16 characters from 31 = about 79 bits of randomness, shown as XXXX-XXXX-XXXX-XXXX.
    chars = "".join(secrets.choice(RECOVERY_CODE_ALPHABET) for _ in range(16))
    return "-".join(chars[i : i + 4] for i in range(0, 16, 4))


def normalize_recovery_code(value: str) -> str:
    """"abcd efgh-..." as typed by hand → "ABCD-EFGH-...", the form that was hashed."""
    chars = re.sub(r"[^A-Z0-9]", "", value.upper())
    return "-".join(chars[i : i + 4] for i in range(0, len(chars), 4))


class UserRead(BaseModel):
    id: int
    nickname: str
    avatar: str
    mfa_enabled: bool
    is_admin: bool


class RegisterRequest(BaseModel):
    nickname: str = Field(pattern=r"^[A-Za-z0-9_-]{3,20}$")
    password: str = Field(min_length=8, max_length=128)
    avatar: str
    is_adult: bool
    # From the Turnstile widget. Optional here, so a missing token gets the captcha message.
    turnstile_token: str | None = None

    @field_validator("avatar")
    @classmethod
    def avatar_is_predefined(cls, value: str) -> str:
        if value not in AVATARS:
            raise ValueError("unknown avatar")
        return value

    @field_validator("is_adult")
    @classmethod
    def must_be_adult(cls, value: bool) -> bool:
        if not value:
            raise ValueError("the user must confirm they are 18 or older")
        return value


class LoginRequest(BaseModel):
    nickname: str
    password: str
    # Needed when MFA is on: a 6-digit code from the authenticator app or a Recovery code.
    code: str | None = None
    # Needed after CAPTCHA_AFTER_FAILED_LOGINS failed logins.
    turnstile_token: str | None = None


class LoginResponse(BaseModel):
    token: str
    user: UserRead


class RegisterResponse(LoginResponse):
    # Shown once. The database keeps only the hashes.
    recovery_codes: list[str]


def start_session(session: Session, user: User) -> str:
    token = secrets.token_urlsafe(32)
    now = datetime.now(UTC)
    session.add(
        LoginSession(
            user_id=user.id,
            token_hash=sha256(token),
            created_at=now,
            expires_at=now + SESSION_LIFETIME,
        )
    )
    return token


def to_read(user: User) -> UserRead:
    return UserRead(
        id=user.id,
        nickname=user.nickname,
        avatar=user.avatar,
        mfa_enabled=user.mfa_enabled_at is not None,
        is_admin=user.is_admin,
    )


def check_totp(session: Session, user: User, code: str) -> bool:
    """True for a valid code from the app. Each code works once: a used or older step fails."""
    code = code.replace(" ", "")
    if user.mfa_secret is None or not re.fullmatch(r"\d{6}", code):
        return False
    totp = pyotp.TOTP(user.mfa_secret)
    current = int(time.time()) // totp.interval
    for step in range(current - MFA_VALID_STEPS, current + MFA_VALID_STEPS + 1):
        if user.mfa_last_step is not None and step <= user.mfa_last_step:
            continue
        if hmac.compare_digest(totp.at(step * totp.interval), code):
            # A conditional UPDATE, not read-check-write: of two requests with the same code at
            # the same moment, the database lets only one through.
            claimed = session.exec(
                update(User)
                .where(
                    User.id == user.id,
                    or_(User.mfa_last_step.is_(None), User.mfa_last_step < step),
                )
                .values(mfa_last_step=step)
            )
            return claimed.rowcount == 1
    return False


def use_recovery_code(session: Session, user: User, code: str) -> bool:
    """True for an unused Recovery code of the user; it is used up."""
    # A conditional UPDATE for the same reason as in check_totp.
    used = session.exec(
        update(RecoveryCode)
        .where(
            RecoveryCode.user_id == user.id,
            RecoveryCode.code_hash == sha256(normalize_recovery_code(code)),
            RecoveryCode.used_at.is_(None),
        )
        .values(used_at=datetime.now(UTC))
    )
    return used.rowcount == 1


def end_other_sessions(session: Session, login: LoginSession) -> None:
    """Log out the user's other devices, so none of them stays logged in without the change."""
    session.exec(
        delete(LoginSession).where(
            LoginSession.user_id == login.user_id, LoginSession.id != login.id
        )
    )


def count_failed_login(session: Session, user: User) -> None:
    """One more failed login. Committed at once, because the request then ends with an error.
    The increment runs in the database, so parallel failures all count."""
    session.exec(
        update(User).where(User.id == user.id).values(failed_logins=User.failed_logins + 1)
    )
    session.commit()


def current_login(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer),
    session: Session = Depends(get_session),
) -> LoginSession:
    """Dependency for protected routes: the valid login session of the request, or 401."""
    if credentials is not None:
        login = session.exec(
            select(LoginSession).where(
                LoginSession.token_hash == sha256(credentials.credentials),
                LoginSession.expires_at > datetime.now(UTC),
            )
        ).first()
        if login is not None:
            return login
    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Nicht angemeldet",
        headers={"WWW-Authenticate": "Bearer"},
    )


def current_user(
    login: LoginSession = Depends(current_login),
    session: Session = Depends(get_session),
) -> User:
    return session.get(User, login.user_id)


def require_admin(user: User = Depends(current_user)) -> User:
    """Dependency for Admin routes: an Admin with MFA on, or 403."""
    if not user.is_admin:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Nur für Admins")
    if user.mfa_enabled_at is None:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Schalte zuerst die Zwei-Faktor-Anmeldung ein",
        )
    return user


class CaptchaConfig(BaseModel):
    # The public key for the Turnstile widget; null when the server has none set.
    site_key: str | None


@router.get("/captcha", response_model=CaptchaConfig)
def captcha_config():
    """The site key comes from the server, so one frontend image works with test and real keys."""
    return CaptchaConfig(site_key=os.environ.get("TURNSTILE_SITE_KEY"))


@router.post("/register", response_model=RegisterResponse, status_code=status.HTTP_201_CREATED)
def register(
    body: RegisterRequest,
    request: Request,
    session: Session = Depends(get_session),
    verify_captcha: Verifier = Depends(turnstile_verifier),
):
    # First, so a bot gets no answer about Nicknames and costs no password hash.
    require_captcha(verify_captcha, body.turnstile_token, request, CAPTCHA_FAILED)
    nickname_taken = HTTPException(
        status_code=status.HTTP_409_CONFLICT, detail="Dieser Nickname ist schon vergeben"
    )
    existing = session.exec(
        select(User).where(func.lower(User.nickname) == body.nickname.lower())
    ).first()
    if existing is not None:
        raise nickname_taken

    user = User(
        nickname=body.nickname,
        password_hash=password_hash.hash(body.password),
        avatar=body.avatar,
        created_at=datetime.now(UTC),
    )
    session.add(user)
    try:
        session.flush()
    except IntegrityError:
        # A second registration with the same Nickname came in at the same moment.
        session.rollback()
        raise nickname_taken

    codes = [new_recovery_code() for _ in range(RECOVERY_CODE_COUNT)]
    session.add_all(RecoveryCode(user_id=user.id, code_hash=sha256(code)) for code in codes)
    token = start_session(session, user)
    session.commit()
    return RegisterResponse(token=token, user=to_read(user), recovery_codes=codes)


@router.post("/login", response_model=LoginResponse)
def login(
    body: LoginRequest,
    request: Request,
    session: Session = Depends(get_session),
    verify_captcha: Verifier = Depends(turnstile_verifier),
):
    login_per_ip.hit(client_ip(request))
    user = session.exec(
        select(User).where(func.lower(User.nickname) == body.nickname.lower())
    ).first()
    # Before the password check: after 3 failures, no more guesses without the captcha.
    if user is not None and user.failed_logins >= CAPTCHA_AFTER_FAILED_LOGINS:
        if not verify_captcha(body.turnstile_token, client_ip(request)):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED, detail=CAPTCHA_REQUIRED
            )
    # The same answer for an unknown Nickname and a wrong password.
    if user is None or not password_hash.verify(body.password, user.password_hash):
        if user is not None:
            count_failed_login(session, user)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Nickname oder Passwort falsch"
        )
    if user.mfa_enabled_at is not None:
        # Only after the right password, so this answer tells nothing to a guesser.
        # It does not count as a failure: the dialog always asks like this first.
        if not body.code:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=MFA_REQUIRED)
        if not (
            check_totp(session, user, body.code)
            or use_recovery_code(session, user, body.code)
        ):
            # Wrong codes count too, so a guesser who knows the password needs the captcha
            # for each of the ~330,000 tries (Stefan's review of SCRUM-26).
            count_failed_login(session, user)
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Code falsch")
    user.failed_logins = 0
    token = start_session(session, user)
    session.commit()
    return LoginResponse(token=token, user=to_read(user))


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
def logout(
    login: LoginSession = Depends(current_login), session: Session = Depends(get_session)
):
    session.delete(login)
    session.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.get("/me", response_model=UserRead)
def me(user: User = Depends(current_user)):
    return to_read(user)


class MfaSetupResponse(BaseModel):
    # For manual entry when the QR code cannot be scanned.
    secret: str
    otpauth_uri: str
    # The otpauth URI as an SVG data URI, ready for an <img src>.
    qr_code: str


class MfaCodeRequest(BaseModel):
    code: str


class MfaDisableRequest(MfaCodeRequest):
    # Asked again: a stolen session token alone must not be enough to turn MFA off.
    password: str


@router.post("/mfa/setup", response_model=MfaSetupResponse)
def mfa_setup(user: User = Depends(current_user), session: Session = Depends(get_session)):
    """A new secret. MFA is not on until /mfa/enable confirms a code from it."""
    if user.mfa_enabled_at is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT, detail="Zwei-Faktor-Anmeldung ist schon an"
        )
    user.mfa_secret = pyotp.random_base32()
    user.mfa_last_step = None
    session.commit()
    uri = pyotp.TOTP(user.mfa_secret).provisioning_uri(name=user.nickname, issuer_name=MFA_ISSUER)
    return MfaSetupResponse(
        secret=user.mfa_secret,
        otpauth_uri=uri,
        qr_code=segno.make(uri, error="m").svg_data_uri(scale=5),
    )


@router.post("/mfa/enable", response_model=UserRead)
def mfa_enable(
    body: MfaCodeRequest,
    login: LoginSession = Depends(current_login),
    session: Session = Depends(get_session),
):
    user = session.get(User, login.user_id)
    if user.mfa_enabled_at is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT, detail="Zwei-Faktor-Anmeldung ist schon an"
        )
    # Only a code from the app: it proves the app has the secret. A Recovery code does not.
    if not check_totp(session, user, body.code):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Code falsch")
    user.mfa_enabled_at = datetime.now(UTC)
    # A device that logged in before has no code; it must log in again with one.
    end_other_sessions(session, login)
    session.commit()
    return to_read(user)


@router.post("/mfa/disable", response_model=UserRead)
def mfa_disable(
    body: MfaDisableRequest,
    user: User = Depends(current_user),
    session: Session = Depends(get_session),
):
    if user.mfa_enabled_at is None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT, detail="Zwei-Faktor-Anmeldung ist schon aus"
        )
    mfa_disable_per_user.hit(user.id)
    if not password_hash.verify(body.password, user.password_hash):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Passwort falsch")
    if not (
        check_totp(session, user, body.code) or use_recovery_code(session, user, body.code)
    ):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Code falsch")
    user.mfa_secret = None
    user.mfa_enabled_at = None
    user.mfa_last_step = None
    session.commit()
    return to_read(user)
