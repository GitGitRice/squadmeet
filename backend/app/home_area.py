"""The signed-in user's Home area (SCRUM-45, ADR-0003): set, read, turn off.

The point is stored only here; turning the Home area off deletes it, and so does the account
delete (foreign key cascade). It is not in the audit log (app/audit.py), so the point is gone
at once.
"""

from datetime import UTC, datetime

from fastapi import APIRouter, Depends, Response, status
from pydantic import BaseModel, Field, field_validator
from sqlalchemy import func
from sqlmodel import Session, select

from app.activities import ActivityType
from app.auth import current_user
from app.db import get_session
from app.models import HomeArea, User

router = APIRouter(prefix="/home-area", tags=["home area"])


class HomeAreaWrite(BaseModel):
    lat: float = Field(ge=-90, le=90)
    lon: float = Field(ge=-180, le=180)
    radius_km: int = Field(ge=1, le=20)
    activity_types: list[ActivityType] = Field(min_length=1)

    @field_validator("activity_types")
    @classmethod
    def unique(cls, types: list[ActivityType]) -> list[ActivityType]:
        if len(set(types)) != len(types):
            raise ValueError("Jede Sportart nur einmal")
        return types


class HomeAreaRead(HomeAreaWrite):
    pass


def point(lat: float, lon: float):
    return func.ST_SetSRID(func.ST_MakePoint(lon, lat), 4326)


def read(session: Session, user_id: int) -> HomeAreaRead | None:
    row = session.exec(
        select(
            func.ST_Y(HomeArea.location),
            func.ST_X(HomeArea.location),
            HomeArea.radius_km,
            HomeArea.activity_types,
        ).where(HomeArea.user_id == user_id)
    ).first()
    if row is None:
        return None
    lat, lon, radius_km, activity_types = row
    return HomeAreaRead(lat=lat, lon=lon, radius_km=radius_km, activity_types=activity_types)


@router.get("", response_model=HomeAreaRead | None)
def get_home_area(user: User = Depends(current_user), session: Session = Depends(get_session)):
    """null while the Home area is off."""
    return read(session, user.id)


@router.put("", response_model=HomeAreaRead)
def set_home_area(
    body: HomeAreaWrite,
    user: User = Depends(current_user),
    session: Session = Depends(get_session),
):
    """Turn it on or change it; one per user."""
    area = session.exec(select(HomeArea).where(HomeArea.user_id == user.id)).first()
    if area is None:
        area = HomeArea(user_id=user.id)
        session.add(area)
    area.location = point(body.lat, body.lon)
    area.radius_km = body.radius_km
    area.activity_types = [str(t) for t in body.activity_types]
    area.updated_at = datetime.now(UTC)
    session.commit()
    return read(session, user.id)


@router.delete("", status_code=status.HTTP_204_NO_CONTENT)
def turn_off_home_area(
    user: User = Depends(current_user), session: Session = Depends(get_session)
):
    """Off: the point is deleted, not kept."""
    area = session.exec(select(HomeArea).where(HomeArea.user_id == user.id)).first()
    if area is not None:
        session.delete(area)
        session.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)
