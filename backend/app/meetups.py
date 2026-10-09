"""Now-meetups (SCRUM-29): "Ich bin jetzt hier" at a Place, for 1–4 hours (see CONTEXT.md).

A Meetup is active while starts_at <= now < ends_at, so it disappears from the map by itself
when its time is over; nothing has to delete it. The Host can end it early.
Joining is SCRUM-34, Cancel and handover are SCRUM-37, a later start is SCRUM-35. Hiding
Meetups from blocked users waits for Block (SCRUM-32).
"""

from datetime import UTC, datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy import and_
from sqlmodel import Session, select

from app.auth import current_user
from app.db import get_session
from app.models import Meetup, Place, User

MIN_HOURS = 1
MAX_HOURS = 4
DEFAULT_HOURS = 2
MAX_PARTY_SIZE = 10

router = APIRouter(tags=["meetups"])


def is_active(now: datetime):
    """SQL condition: the Meetup runs at `now`.

    `now` comes from the app, the same clock that sets starts_at. PostgreSQL's now() is the
    start of the transaction, so a Meetup created later in the same transaction would not
    count as active yet.
    """
    return and_(Meetup.starts_at <= now, Meetup.ends_at > now)


class NowMeetupCreate(BaseModel):
    place_id: int
    hours: int = Field(default=DEFAULT_HOURS, ge=MIN_HOURS, le=MAX_HOURS)
    party_size: int = Field(default=1, ge=1, le=MAX_PARTY_SIZE)


class HostRead(BaseModel):
    id: int
    nickname: str
    avatar: str


class MeetupRead(BaseModel):
    id: int
    place_id: int
    host: HostRead
    party_size: int
    starts_at: datetime
    ends_at: datetime


def to_read(meetup: Meetup, host: User) -> MeetupRead:
    return MeetupRead(
        id=meetup.id,
        place_id=meetup.place_id,
        host=HostRead(id=host.id, nickname=host.nickname, avatar=host.avatar),
        party_size=meetup.party_size,
        starts_at=meetup.starts_at,
        ends_at=meetup.ends_at,
    )


@router.post("/meetups", response_model=MeetupRead, status_code=status.HTTP_201_CREATED)
def create_now_meetup(
    body: NowMeetupCreate,
    user: User = Depends(current_user),
    session: Session = Depends(get_session),
):
    """"Ich bin jetzt hier": starts now, ends after `hours`. The creator is the Host."""
    if session.get(Place, body.place_id) is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Place not found")
    now = datetime.now(UTC)
    meetup = Meetup(
        place_id=body.place_id,
        host_id=user.id,
        party_size=body.party_size,
        starts_at=now,
        ends_at=now + timedelta(hours=body.hours),
    )
    session.add(meetup)
    session.commit()
    session.refresh(meetup)
    return to_read(meetup, user)


@router.get("/places/{place_id}/meetups", response_model=list[MeetupRead])
def list_active_meetups(place_id: int, session: Session = Depends(get_session)):
    """The active Meetups at a Place, for the Place detail page. The oldest first."""
    if session.get(Place, place_id) is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Place not found")
    rows = session.exec(
        select(Meetup, User)
        .join(User, User.id == Meetup.host_id)
        .where(Meetup.place_id == place_id, is_active(datetime.now(UTC)))
        .order_by(Meetup.starts_at, Meetup.id)
    ).all()
    return [to_read(meetup, host) for meetup, host in rows]


@router.post("/meetups/{meetup_id}/end", response_model=MeetupRead)
def end_meetup_early(
    meetup_id: int,
    user: User = Depends(current_user),
    session: Session = Depends(get_session),
):
    """The Host ends the Meetup now; it leaves the map at once."""
    meetup = session.get(Meetup, meetup_id)
    if meetup is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Meetup not found")
    if meetup.host_id != user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Nur der Gastgeber kann das Treffen beenden",
        )
    now = datetime.now(UTC)
    if meetup.ends_at <= now:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT, detail="Das Treffen ist schon vorbei"
        )
    meetup.ends_at = now
    session.commit()
    session.refresh(meetup)
    return to_read(meetup, user)
