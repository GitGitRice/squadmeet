from datetime import datetime
from typing import Any

from geoalchemy2 import Geometry
from sqlalchemy import Column, DateTime, ForeignKey, Index, UniqueConstraint, text
from sqlmodel import Field, SQLModel


class Place(SQLModel, table=True):
    """A public, free location for one Activity type (see CONTEXT.md)."""

    # One OSM pitch with "sport=soccer;basketball" gives two Places, one per Activity type.
    __table_args__ = (
        UniqueConstraint("osm_id", "activity_type", name="uq_place_osm_id_activity_type"),
    )

    id: int | None = Field(default=None, primary_key=True)
    name: str
    # One of app.activities.ActivityType; the database checks it (migration 0003).
    activity_type: str
    # "node/123" or "way/456" for a Place from OpenStreetMap, empty for a suggested Place.
    osm_id: str | None = None
    # WGS 84 (lon/lat), the coordinate system of OpenStreetMap and Leaflet.
    location: Any = Field(sa_column=Column(Geometry("POINT", srid=4326), nullable=False))


class PlaceRead(SQLModel):
    id: int
    name: str
    activity_type: str
    lat: float
    lon: float


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


class RecoveryCode(SQLModel, table=True):
    """A one-time code for a password reset (see CONTEXT.md). Only the hash is stored."""

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
