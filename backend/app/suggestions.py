"""Place suggestions (SCRUM-30): a user at a Place that is missing on the map suggests it.

Before saving, the app asks for Places of the same Activity type within DUPLICATE_RADIUS_M
("Ist es einer davon?"); the user can still continue. A suggestion is a Place with
is_suggestion = true, so the map, the Place detail and its URL work for it as for any Place.
The suggester's own Confirmation is the first of CONFIRMATIONS_NEEDED; confirming at the Place
is SCRUM-36.
"""

from datetime import UTC, datetime

from fastapi import APIRouter, Depends, Query, status
from geoalchemy2 import Geography
from pydantic import BaseModel, Field
from sqlalchemy import cast, func
from sqlmodel import Session

from app.activities import LABELS, ActivityType
from app.auth import current_user
from app.db import get_session
from app.models import Place, PlaceConfirmation, PlaceRead, User
from app.place_reads import select_place_reads
from app.rate_limit import RateLimit

DUPLICATE_RADIUS_M = 50
CONFIRMATIONS_NEEDED = 3
MAX_NAME_LENGTH = 60

router = APIRouter(prefix="/place-suggestions", tags=["place suggestions"])

# A user stands at each Place they suggest, so a few per hour is plenty; more is map spam.
suggest_per_user = RateLimit(limit=5, window_seconds=60 * 60)


class NearbyPlace(PlaceRead):
    distance_m: int


class SuggestionCreate(BaseModel):
    activity_type: ActivityType
    lat: float = Field(ge=-90, le=90)
    lon: float = Field(ge=-180, le=180)
    # Empty or missing: the German word for the Activity type, as for an OSM Place without a name.
    name: str = Field(default="", max_length=MAX_NAME_LENGTH)


def point(lat: float, lon: float):
    return func.ST_SetSRID(func.ST_MakePoint(lon, lat), 4326)


@router.get("/nearby", response_model=list[NearbyPlace])
def nearby_places(
    lat: float = Query(ge=-90, le=90),
    lon: float = Query(ge=-180, le=180),
    activity_type: ActivityType = Query(),
    session: Session = Depends(get_session),
):
    """The duplicate warning: Places of the same Activity type within DUPLICATE_RADIUS_M,
    suggestions included, the nearest first."""
    here = cast(point(lat, lon), Geography)
    there = cast(Place.location, Geography)
    distance = func.ST_Distance(there, here)
    rows = session.exec(
        select_place_reads()
        .add_columns(func.round(distance).label("distance_m"))
        .where(
            Place.activity_type == activity_type,
            # Geography: the distance is in metres on the earth, not in degrees.
            func.ST_DWithin(there, here, DUPLICATE_RADIUS_M),
        )
        .order_by(distance, Place.id)
    ).all()
    return [NearbyPlace.model_validate(row, from_attributes=True) for row in rows]


@router.post("", response_model=PlaceRead, status_code=status.HTTP_201_CREATED)
def suggest_place(
    body: SuggestionCreate,
    user: User = Depends(current_user),
    session: Session = Depends(get_session),
):
    """Add a Place suggestion at the user's position, with the user's own Confirmation."""
    suggest_per_user.hit(user.id)
    place = Place(
        name=body.name.strip() or LABELS[body.activity_type],
        activity_type=body.activity_type,
        location=f"SRID=4326;POINT({body.lon} {body.lat})",
        is_suggestion=True,
    )
    session.add(place)
    session.flush()
    session.add(
        PlaceConfirmation(place_id=place.id, user_id=user.id, created_at=datetime.now(UTC))
    )
    session.commit()
    row = session.exec(select_place_reads().where(Place.id == place.id)).one()
    return PlaceRead.model_validate(row, from_attributes=True)
