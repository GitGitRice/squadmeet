from datetime import datetime
from typing import Any

from geoalchemy2 import Geometry
from sqlalchemy import (
    BigInteger,
    Boolean,
    CheckConstraint,
    Column,
    DateTime,
    ForeignKey,
    Index,
    Integer,
    UniqueConstraint,
    false,
    text,
)
from sqlmodel import Field, SQLModel

from app.activities import ACTIVITY_TYPES


class Place(SQLModel, table=True):
    """A public, free location for one Activity type (see CONTEXT.md)."""

    __table_args__ = (
        # One OSM pitch with "sport=soccer;basketball" gives two Places, one per Activity type.
        UniqueConstraint("osm_id", "activity_type", name="uq_place_osm_id_activity_type"),
        # The same check as migration 0003, so create_all and autogenerate know it too.
        CheckConstraint(
            "activity_type IN (" + ", ".join(f"'{t}'" for t in ACTIVITY_TYPES) + ")",
            name="ck_place_activity_type",
        ),
    )

    id: int | None = Field(default=None, primary_key=True)
    name: str
    # One of app.activities.ActivityType; the database checks it (ck_place_activity_type).
    activity_type: str
    # "node/123" or "way/456" for a Place from OpenStreetMap, empty for a suggested Place.
    osm_id: str | None = None
    # WGS 84 (lon/lat), the coordinate system of OpenStreetMap and Leaflet.
    location: Any = Field(sa_column=Column(Geometry("POINT", srid=4326), nullable=False))
    # A Place suggestion (SCRUM-30): a user added it, and it has fewer than 3 Confirmations.
    is_suggestion: bool = Field(
        default=False, sa_column=Column(Boolean, nullable=False, server_default=false())
    )


class PlaceConfirmation(SQLModel, table=True):
    """A user's Confirmation that a Place suggestion is real (see CONTEXT.md). The user who
    suggested the Place has the first one (SCRUM-30); others confirm at the Place (SCRUM-36)."""

    __tablename__ = "place_confirmation"
    __table_args__ = (
        UniqueConstraint("place_id", "user_id", name="uq_place_confirmation_place_user"),
    )

    id: int | None = Field(default=None, primary_key=True)
    place_id: int = Field(
        sa_column=Column(ForeignKey("place.id", ondelete="CASCADE"), nullable=False)
    )
    # Deleting the account deletes the user's Confirmations; the Place suggestion stays.
    user_id: int = Field(
        sa_column=Column(ForeignKey("app_user.id", ondelete="CASCADE"), nullable=False, index=True)
    )
    created_at: datetime = Field(sa_column=Column(DateTime(timezone=True), nullable=False))


class PlaceRead(SQLModel):
    id: int
    name: str
    activity_type: str
    lat: float
    lon: float
    # Party sizes of the active Meetups at the Place; 0 = nobody is there now (SCRUM-29).
    people_now: int = 0
    # A Place suggestion and its number of Confirmations so far (SCRUM-30); 0 for OSM Places.
    is_suggestion: bool = False
    confirmations: int = 0


class User(SQLModel, table=True):
    """A registered person. No email address is stored (ADR-0005)."""

    # "user" is a reserved word in PostgreSQL.
    __tablename__ = "app_user"
    # A Nickname is unique without regard to case: "Steven" blocks "steven".
    __table_args__ = (Index("uq_app_user_nickname_lower", text("lower(nickname)"), unique=True),)

    id: int | None = Field(default=None, primary_key=True)
    nickname: str
    password_hash: str
    avatar: str
    created_at: datetime = Field(sa_column=Column(DateTime(timezone=True), nullable=False))
    # Set only by `python -m app.admin grant` (app/admin.py). Admin routes also need MFA on.
    is_admin: bool = Field(
        default=False, sa_column=Column(Boolean, nullable=False, server_default=false())
    )
    # Base32 TOTP secret (SCRUM-26). Stored in plain text: the server must compute the codes.
    # Set by MFA setup; MFA is on only once a code confirmed it (mfa_enabled_at).
    mfa_secret: str | None = None
    mfa_enabled_at: datetime | None = Field(
        default=None, sa_column=Column(DateTime(timezone=True))
    )
    # The 30-second time step of the last accepted code, so a code works only once.
    mfa_last_step: int | None = Field(default=None, sa_column=Column(BigInteger))
    # Wrong passwords and wrong MFA codes since the last login. From 3 on, login also needs the
    # captcha (SCRUM-27). A login resets it to 0.
    failed_logins: int = Field(
        default=0, sa_column=Column(Integer, nullable=False, server_default=text("0"))
    )


class RecoveryCode(SQLModel, table=True):
    """A one-time code for a password reset or an MFA login (see CONTEXT.md). Only the hash is
    stored."""

    __tablename__ = "recovery_code"

    id: int | None = Field(default=None, primary_key=True)
    user_id: int = Field(
        sa_column=Column(ForeignKey("app_user.id", ondelete="CASCADE"), nullable=False, index=True)
    )
    code_hash: str
    used_at: datetime | None = Field(default=None, sa_column=Column(DateTime(timezone=True)))


class LoginSession(SQLModel, table=True):
    """One logged-in device. Logout deletes the row, so its token stops working at once."""

    __tablename__ = "login_session"

    id: int | None = Field(default=None, primary_key=True)
    user_id: int = Field(
        sa_column=Column(ForeignKey("app_user.id", ondelete="CASCADE"), nullable=False, index=True)
    )
    token_hash: str = Field(unique=True)
    created_at: datetime = Field(sa_column=Column(DateTime(timezone=True), nullable=False))
    expires_at: datetime = Field(sa_column=Column(DateTime(timezone=True), nullable=False))


class Meetup(SQLModel, table=True):
    """A user's announcement to be at a Place from starts_at until ends_at (see CONTEXT.md).

    SCRUM-29 builds the Now-meetup: it starts when it is created and ends after 1–4 hours.
    It is active while starts_at <= now < ends_at; there is no job that deletes it.
    """

    __tablename__ = "meetup"
    __table_args__ = (
        CheckConstraint("party_size BETWEEN 1 AND 10", name="ck_meetup_party_size"),
        CheckConstraint("ends_at > starts_at", name="ck_meetup_ends_after_start"),
    )

    id: int | None = Field(default=None, primary_key=True)
    place_id: int = Field(
        sa_column=Column(ForeignKey("place.id", ondelete="CASCADE"), nullable=False, index=True)
    )
    # The creator is the Host (SCRUM-29). Handing the role over is SCRUM-37.
    host_id: int = Field(
        sa_column=Column(ForeignKey("app_user.id", ondelete="CASCADE"), nullable=False, index=True)
    )
    # The Host's own Party size, the Host included (1–10). Joins of others are SCRUM-34.
    party_size: int
    starts_at: datetime = Field(sa_column=Column(DateTime(timezone=True), nullable=False))
    # The Host ending the Meetup early sets this to the moment of the end.
    ends_at: datetime = Field(sa_column=Column(DateTime(timezone=True), nullable=False))

