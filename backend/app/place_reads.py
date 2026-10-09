"""The query for PlaceRead, shared by the map (app.main) and the duplicate warning
(app.suggestions)."""

from datetime import UTC, datetime

from sqlalchemy import func
from sqlmodel import select

from app.meetups import is_active
from app.models import Meetup, Place, PlaceConfirmation


def select_place_reads():
    """The columns of a PlaceRead: the PostGIS point as lat and lon, the people there now, and
    the Confirmations of a Place suggestion."""
    people_now = (
        select(func.coalesce(func.sum(Meetup.party_size), 0))
        .where(Meetup.place_id == Place.id, is_active(datetime.now(UTC)))
        .scalar_subquery()
    )
    confirmations = (
        select(func.count())
        .where(PlaceConfirmation.place_id == Place.id)
        .scalar_subquery()
    )
    return select(
        Place.id,
        Place.name,
        Place.activity_type,
        func.ST_Y(Place.location).label("lat"),
        func.ST_X(Place.location).label("lon"),
        people_now.label("people_now"),
        Place.is_suggestion,
        confirmations.label("confirmations"),
    )
