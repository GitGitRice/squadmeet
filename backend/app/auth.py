"""Register, log in, log out (SCRUM-22). No email address (ADR-0005).

Passwords are hashed with Argon2: people choose weak passwords, so the hash must be slow.
Recovery codes and session tokens are long random values, so a fast SHA-256 hash is enough.
"""

import hashlib
import secrets
from datetime import UTC, datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException, Response, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from pwdlib import PasswordHash
from pydantic import BaseModel, Field, field_validator
from sqlalchemy import func
from sqlalchemy.exc import IntegrityError
from sqlmodel import Session, select

from app.db import get_session
from app.models import LoginSession, RecoveryCode, User

# The predefined Avatars. The frontend shows a picture for each key.
AVATARS = (
    "fox", "bear", "owl", "cat", "dog", "panda",
    "frog", "tiger", "koala", "penguin", "rabbit", "lion",
)  # fmt: skip

RECOVERY_CODE_COUNT = 10
# Without 0/O and 1/I/L, so a code copied by hand has no look-alike characters.
RECOVERY_CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"
SESSION_LIFETIME = timedelta(days=30)

password_hash = PasswordHash.recommended()
bearer = HTTPBearer(auto_error=False)
router = APIRouter(prefix="/auth", tags=["auth"])


def sha256(value: str) -> str:
    return hashlib.sha256(value.encode()).hexdigest()


def new_recovery_code() -> str:
    # 16 characters from 31 = about 79 bits of randomness, shown as XXXX-XXXX-XXXX-XXXX.
    chars = "".join(secrets.choice(RECOVERY_CODE_ALPHABET) for _ in range(16))
    return "-".join(chars[i : i + 4] for i in range(0, 16, 4))


class UserRead(BaseModel):
    id: int
    nickname: str
    avatar: str


class RegisterRequest(BaseModel):
    nickname: str = Field(pattern=r"^[A-Za-z0-9_-]{3,20}$")
    password: str = Field(min_length=8, max_length=128)
    avatar: str
    is_adult: bool

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
    return UserRead(id=user.id, nickname=user.nickname, avatar=user.avatar)


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


@router.post("/register", response_model=RegisterResponse, status_code=status.HTTP_201_CREATED)
def register(body: RegisterRequest, session: Session = Depends(get_session)):
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
def login(body: LoginRequest, session: Session = Depends(get_session)):
    user = session.exec(
        select(User).where(func.lower(User.nickname) == body.nickname.lower())
    ).first()
    # The same answer for an unknown Nickname and a wrong password.
    if user is None or not password_hash.verify(body.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Nickname oder Passwort falsch"
        )
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
