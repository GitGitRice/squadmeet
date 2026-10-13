"""The Place status (SCRUM-60, CONTEXT.md: Place status) and what it allows.

A Place has one status, worked out from its columns by one SQL expression (STATUS), so the
check of one Place (require) and the filter of a list (allowed_in) cannot drift apart.
RULES says for each use and status whether the use is allowed, or which error it answers.
Callers ask this module and do not read is_suggestion, locked_at or deleted_at themselves.

This module imports no other app module except the models, so every route can import it.
"""

from enum import StrEnum
from typing import NamedTuple

from fastapi import HTTPException, status
from sqlalchemy import case
from sqlmodel import Session, select

from app.models import Place


class PlaceStatus(StrEnum):
    ACTIVE = "active"
    # A user added it, and it is not confirmed yet (SCRUM-30, SCRUM-36).
    SUGGESTION = "suggestion"
    # An Admin locked it (SCRUM-39); an Admin can unlock it.
    LOCKED = "locked"
    # An Admin deleted it (SCRUM-39). The row stays, so the OSM import cannot bring it back.
    DELETED = "deleted"


class PlaceUse(StrEnum):
    # The Place detail and what it shows: Meetups, Ratings, Reasons.
    VIEW = "view"
    # The map, the name search and the duplicate warning of a suggestion.
    MAP = "map"
    MEETUP = "meetup"
    # A Rating, and the "noch so / behoben" vote on an issue.
    RATE = "rate"
    CONFIRM = "confirm"
    # Lock, unlock and delete.
    ADMIN = "admin"


# When two columns are set, the stronger status counts: deleted, then locked, then suggestion.
STATUS = case(
    (Place.deleted_at.is_not(None), PlaceStatus.DELETED.value),
    (Place.locked_at.is_not(None), PlaceStatus.LOCKED.value),
    (Place.is_suggestion, PlaceStatus.SUGGESTION.value),
    else_=PlaceStatus.ACTIVE.value,
)


class Refusal(NamedTuple):
    status_code: int
    detail: str


# Users must not learn that a hidden Place exists, so it answers as if there were none.
NOT_FOUND = Refusal(status.HTTP_404_NOT_FOUND, "Place not found")
# A Place suggestion may not be real; a Meetup or a Rating there would make it look real.
NOT_CONFIRMED = Refusal(status.HTTP_409_CONFLICT, "Dieser Platz ist noch nicht bestätigt")
ALREADY_CONFIRMED = Refusal(status.HTTP_409_CONFLICT, "Dieser Platz ist schon bestätigt.")

ACTIVE, SUGGESTION, LOCKED, DELETED = PlaceStatus

# None = allowed.
RULES: dict[PlaceUse, dict[PlaceStatus, Refusal | None]] = {
    PlaceUse.VIEW: {ACTIVE: None, SUGGESTION: None, LOCKED: NOT_FOUND, DELETED: NOT_FOUND},
    PlaceUse.MAP: {ACTIVE: None, SUGGESTION: None, LOCKED: NOT_FOUND, DELETED: NOT_FOUND},
    PlaceUse.MEETUP: {
        ACTIVE: None,
        SUGGESTION: NOT_CONFIRMED,
        LOCKED: NOT_FOUND,
        DELETED: NOT_FOUND,
    },
    PlaceUse.RATE: {
        ACTIVE: None,
        SUGGESTION: NOT_CONFIRMED,
        LOCKED: NOT_FOUND,
        DELETED: NOT_FOUND,
    },
    PlaceUse.CONFIRM: {
        ACTIVE: ALREADY_CONFIRMED,
        SUGGESTION: None,
        LOCKED: NOT_FOUND,
        DELETED: NOT_FOUND,
    },
    # An Admin can lock a Place suggestion and unlock a Locked place; a deleted one is gone.
    PlaceUse.ADMIN: {ACTIVE: None, SUGGESTION: None, LOCKED: None, DELETED: NOT_FOUND},
}

# place.id is a PostgreSQL integer; a bigger number in the URL would make the query fail.
MAX_DB_INT = 2_147_483_647


def allowed_in(use: PlaceUse):
    """SQL condition for a list: the Places whose status allows this use."""
    return STATUS.in_([s.value for s, refusal in RULES[use].items() if refusal is None])


def load(session: Session, place_id: int) -> tuple[Place, PlaceStatus] | None:
    if not 1 <= place_id <= MAX_DB_INT:
        return None
    row = session.exec(select(Place, STATUS).where(Place.id == place_id)).first()
    return row and (row[0], PlaceStatus(row[1]))


def get_status(session: Session, place_id: int) -> PlaceStatus | None:
    """The status of the Place, or None when it does not exist."""
    loaded = load(session, place_id)
    return loaded and loaded[1]


def require(session: Session, place_id: int, use: PlaceUse) -> Place:
    """The Place, when its status allows this use; else the error from RULES (404 when there is
    no such Place)."""
    loaded = load(session, place_id)
    refusal = NOT_FOUND if loaded is None else RULES[use][loaded[1]]
    if refusal is not None:
        raise HTTPException(status_code=refusal.status_code, detail=refusal.detail)
    return loaded[0]
