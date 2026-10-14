from datetime import datetime
from typing import Any, Literal

from geoalchemy2 import Geometry
from sqlalchemy import (
    ARRAY,
    BigInteger,
    Boolean,
    CheckConstraint,
    Column,
    DateTime,
    ForeignKey,
    Index,
    Integer,
    String,
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
    # Nearest address from Nominatim. Filled once when the Place detail is first opened.
    address: str | None = None
    # WGS 84 (lon/lat), the coordinate system of OpenStreetMap and Leaflet.
    location: Any = Field(sa_column=Column(Geometry("POINT", srid=4326), nullable=False))
    # A Place suggestion (SCRUM-30): a user added it, and no Admin has approved it yet.
    is_suggestion: bool = Field(
        default=False, sa_column=Column(Boolean, nullable=False, server_default=false())
    )
    # SCRUM-56: when the user suggested it. An Admin may approve it 24 h after this at the
    # earliest.
    suggested_at: datetime | None = Field(
        default=None, sa_column=Column(DateTime(timezone=True), nullable=True)
    )
    # SCRUM-56: when it got its 3rd Confirmation. From then on it waits for an Admin.
    confirmed_at: datetime | None = Field(
        default=None, sa_column=Column(DateTime(timezone=True), nullable=True)
    )
    # SCRUM-56: when an Admin approved it; it is an active Place since then.
    approved_at: datetime | None = Field(
        default=None, sa_column=Column(DateTime(timezone=True), nullable=True)
    )
    # SCRUM-56: what OSM has at the point ("building", "private", "residential"), only a hint
    # for the Admin. [] = nothing found; None = not checked yet, or Overpass did not answer.
    osm_hints: list[str] | None = Field(
        default=None, sa_column=Column(ARRAY(String), nullable=True)
    )
    # SCRUM-39: an Admin locked it (not publicly accessible); it is hidden until unlocked.
    locked_at: datetime | None = Field(
        default=None, sa_column=Column(DateTime(timezone=True), nullable=True)
    )
    # SCRUM-39: an Admin deleted it. The row stays, so the OSM import cannot bring it back.
    deleted_at: datetime | None = Field(
        default=None, sa_column=Column(DateTime(timezone=True), nullable=True)
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
    address: str | None = None
    # Party sizes of the active Meetups at the Place; 0 = nobody is there now (SCRUM-29).
    people_now: int = 0
    # A Place suggestion and its number of Confirmations so far (SCRUM-30); 0 for OSM Places.
    is_suggestion: bool = False
    confirmations: int = 0
    # A Place suggestion with 3 Confirmations that waits for an Admin approval (SCRUM-56).
    waiting_for_admin: bool = False


class PlaceSearchHit(SQLModel):
    kind: Literal["place", "address"]
    label: str
    lat: float
    lon: float
    place_id: int | None = None


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

    A Now-meetup (SCRUM-29) starts when it is created, a later Meetup (SCRUM-35) at a start
    time up to 30 days ahead; both end after 1–4 hours. It is active while
    starts_at <= now < ends_at; there is no job that deletes it.
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
    # The Host's own Party size, the Host included (1–10). Others come as MeetupJoin.
    party_size: int
    starts_at: datetime = Field(sa_column=Column(DateTime(timezone=True), nullable=False))
    # The Host ending the Meetup early sets this to the moment of the end.
    ends_at: datetime = Field(sa_column=Column(DateTime(timezone=True), nullable=False))
    # SCRUM-37: the Host called it off before the start; it stays listed as cancelled.
    cancelled_at: datetime | None = Field(
        default=None, sa_column=Column(DateTime(timezone=True), nullable=True)
    )
    # SCRUM-37: nobody is left; it is gone from the list and the map.
    closed_at: datetime | None = Field(
        default=None, sa_column=Column(DateTime(timezone=True), nullable=True)
    )
    # SCRUM-37: the Host moved to this new Meetup; the users who were in get an offer.
    moved_to_id: int | None = Field(
        default=None,
        sa_column=Column(ForeignKey("meetup.id", ondelete="SET NULL"), nullable=True),
    )
    # True while the current Host (who got the role after the move) has not answered.
    host_move_pending: bool = Field(
        default=False, sa_column=Column(Boolean, nullable=False, server_default=false())
    )


class MeetupJoin(SQLModel, table=True):
    """A user's Join of a Meetup with their Party size (SCRUM-34, see CONTEXT.md).

    One per user per Meetup; Leave deletes it. The Host has no Join: their Party size is on
    the Meetup. The earliest Join gets the Host role when the Host Leaves (SCRUM-37).
    """

    __tablename__ = "meetup_join"
    __table_args__ = (
        UniqueConstraint("meetup_id", "user_id", name="uq_meetup_join_meetup_user"),
        CheckConstraint("party_size BETWEEN 1 AND 10", name="ck_meetup_join_party_size"),
    )

    id: int | None = Field(default=None, primary_key=True)
    meetup_id: int = Field(
        sa_column=Column(ForeignKey("meetup.id", ondelete="CASCADE"), nullable=False, index=True)
    )
    user_id: int = Field(
        sa_column=Column(ForeignKey("app_user.id", ondelete="CASCADE"), nullable=False, index=True)
    )
    party_size: int
    joined_at: datetime = Field(sa_column=Column(DateTime(timezone=True), nullable=False))
    # SCRUM-37: the Host moved the Meetup; this user has not yet chosen go / stay / leave.
    move_pending: bool = Field(
        default=False, sa_column=Column(Boolean, nullable=False, server_default=false())
    )



class Rating(SQLModel, table=True):
    """A user's 1–5 stars for a Place with at least one Reason (SCRUM-31, see CONTEXT.md).

    One per user per Place: a second Rating replaces the first.
    """

    __tablename__ = "rating"
    __table_args__ = (
        UniqueConstraint("place_id", "user_id", name="uq_rating_place_user"),
        CheckConstraint("stars BETWEEN 1 AND 5", name="ck_rating_stars"),
        CheckConstraint("cardinality(reasons) >= 1", name="ck_rating_has_reason"),
    )

    id: int | None = Field(default=None, primary_key=True)
    place_id: int = Field(
        sa_column=Column(ForeignKey("place.id", ondelete="CASCADE"), nullable=False)
    )
    user_id: int = Field(
        sa_column=Column(ForeignKey("app_user.id", ondelete="CASCADE"), nullable=False, index=True)
    )
    stars: int
    # Keys from app/reasons.py for the Place's Activity type. No free text (ADR-0004).
    reasons: list[str] = Field(sa_column=Column(ARRAY(String), nullable=False))
    created_at: datetime = Field(sa_column=Column(DateTime(timezone=True), nullable=False))
    # Set again when the user changes the Rating; the Condition counts only recent ones.
    updated_at: datetime = Field(sa_column=Column(DateTime(timezone=True), nullable=False))


class ConditionVote(SQLModel, table=True):
    """A user's answer to "Ist das noch so?" for an issue of a Place (SCRUM-31, app/ratings.py).

    Only stored, never changed: the open check and its result are worked out from the votes.
    """

    __tablename__ = "condition_vote"
    __table_args__ = (Index("ix_condition_vote_place_reason", "place_id", "reason_key"),)

    id: int | None = Field(default=None, primary_key=True)
    place_id: int = Field(
        sa_column=Column(ForeignKey("place.id", ondelete="CASCADE"), nullable=False)
    )
    # A condition_issue key from app/reasons.py.
    reason_key: str
    user_id: int = Field(
        sa_column=Column(ForeignKey("app_user.id", ondelete="CASCADE"), nullable=False, index=True)
    )
    # True = the issue is still there; False = it is fixed.
    still_there: bool
    created_at: datetime = Field(sa_column=Column(DateTime(timezone=True), nullable=False))


class ContactRequest(SQLModel, table=True):
    """A Contact request and, once accepted, the Contact itself (SCRUM-32, see CONTEXT.md).

    One row per pair of users, from the one who asked. status: pending, accepted (they are
    Contacts) or declined (the asker sees it and may ask again, which makes it pending).
    """

    __tablename__ = "contact_request"
    __table_args__ = (
        UniqueConstraint("requester_id", "addressee_id", name="uq_contact_request_pair"),
        CheckConstraint("requester_id <> addressee_id", name="ck_contact_request_not_self"),
        CheckConstraint(
            "status IN ('pending', 'accepted', 'declined')", name="ck_contact_request_status"
        ),
    )

    id: int | None = Field(default=None, primary_key=True)
    requester_id: int = Field(
        sa_column=Column(ForeignKey("app_user.id", ondelete="CASCADE"), nullable=False, index=True)
    )
    addressee_id: int = Field(
        sa_column=Column(ForeignKey("app_user.id", ondelete="CASCADE"), nullable=False, index=True)
    )
    status: str
    updated_at: datetime = Field(sa_column=Column(DateTime(timezone=True), nullable=False))


class UserBlock(SQLModel, table=True):
    """A Block (SCRUM-32, see CONTEXT.md): blocker_id blocked blocked_id. One direction only."""

    __tablename__ = "user_block"
    __table_args__ = (
        UniqueConstraint("blocker_id", "blocked_id", name="uq_user_block_pair"),
        CheckConstraint("blocker_id <> blocked_id", name="ck_user_block_not_self"),
    )

    id: int | None = Field(default=None, primary_key=True)
    blocker_id: int = Field(
        sa_column=Column(ForeignKey("app_user.id", ondelete="CASCADE"), nullable=False, index=True)
    )
    blocked_id: int = Field(
        sa_column=Column(ForeignKey("app_user.id", ondelete="CASCADE"), nullable=False, index=True)
    )
    created_at: datetime = Field(sa_column=Column(DateTime(timezone=True), nullable=False))
