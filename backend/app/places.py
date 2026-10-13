"""Which Places users can see. A Place that an Admin locked or deleted (SCRUM-39) is hidden
everywhere: map, search, Place detail, Meetups, Ratings and suggestions answer as if it did not
exist. Only the Admin routes (app.admin_places) see it."""

from fastapi import HTTPException, status
from sqlalchemy import and_
from sqlmodel import Session

from app.models import Place


def is_visible():
    """SQL condition: the Place is neither locked nor deleted."""
    return and_(Place.locked_at.is_(None), Place.deleted_at.is_(None))


def get_visible_place(session: Session, place_id: int) -> Place:
    """The Place, or 404 when it does not exist or is locked or deleted."""
    place = session.get(Place, place_id)
    if place is None or place.locked_at is not None or place.deleted_at is not None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Place not found")
    return place
