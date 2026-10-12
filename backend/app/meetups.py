"""Meetups at a Place, for 1–4 hours (see CONTEXT.md): a Now-meetup ("Ich bin jetzt hier",
SCRUM-29) starts at once, a later Meetup (SCRUM-35) at a start time up to 30 days ahead.

A Meetup is active while starts_at <= now < ends_at, so it disappears from the map by itself
when its time is over; nothing has to delete it. The Host can end it early, or move the start
of a Meetup that has not started yet. Joining is SCRUM-34, Cancel and handover are SCRUM-37.
Hiding Meetups from blocked users waits for Block (SCRUM-32).
"""

from datetime import UTC, datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import AwareDatetime, BaseModel, Field
from sqlalchemy import and_
from sqlmodel import Session, select

from app.auth import current_user
from app.db import get_session
from app.models import Meetup, Place, User

MIN_HOURS = 1
MAX_HOURS = 4
DEFAULT_HOURS = 2
MAX_PARTY_SIZE = 10
MAX_DAYS_AHEAD = 30

router = APIRouter(tags=["meetups"])


def is_active(now: datetime):
    """SQL condition: the Meetup runs at `now`.

    `now` comes from the app, the same clock that sets starts_at. PostgreSQL's now() is the
    start of the transaction, so a Meetup created later in the same transaction would not
    count as active yet.
    """
    return and_(Meetup.starts_at <= now, Meetup.ends_at > now)


def check_start(starts_at: datetime, now: datetime) -> None:
    """A later start must be in the future and at most MAX_DAYS_AHEAD days ahead."""
    if starts_at <= now:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail="Der Beginn muss in der Zukunft liegen",
        )
    if starts_at > now + timedelta(days=MAX_DAYS_AHEAD):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail=f"Ein Treffen kann höchstens {MAX_DAYS_AHEAD} Tage im Voraus geplant werden",
        )


class MeetupCreate(BaseModel):
    place_id: int
    hours: int = Field(default=DEFAULT_HOURS, ge=MIN_HOURS, le=MAX_HOURS)
    party_size: int = Field(default=1, ge=1, le=MAX_PARTY_SIZE)
    # Empty = a Now-meetup. A time needs its time zone, e.g. "2026-10-17T18:00:00+02:00".
    starts_at: AwareDatetime | None = None


class MeetupTimeChange(BaseModel):
    starts_at: AwareDatetime


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
def create_meetup(
    body: MeetupCreate,
    user: User = Depends(current_user),
    session: Session = Depends(get_session),
):
    """A Meetup that starts now or at `starts_at` and ends after `hours`. The creator is the
    Host."""
    if session.get(Place, body.place_id) is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Place not found")
    now = datetime.now(UTC)
    starts_at = now
    if body.starts_at is not None:
        check_start(body.starts_at, now)
        starts_at = body.starts_at
    meetup = Meetup(
        place_id=body.place_id,
        host_id=user.id,
        party_size=body.party_size,
        starts_at=starts_at,
        ends_at=starts_at + timedelta(hours=body.hours),
    )
    session.add(meetup)
    session.commit()
    session.refresh(meetup)
    return to_read(meetup, user)


@router.get("/places/{place_id}/meetups", response_model=list[MeetupRead])
def list_meetups(place_id: int, session: Session = Depends(get_session)):
    """The active and the later Meetups at a Place, for the Place detail page. By start time,
    so the active ones come first."""
    if session.get(Place, place_id) is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Place not found")
    rows = session.exec(
        select(Meetup, User)
        .join(User, User.id == Meetup.host_id)
        .where(Meetup.place_id == place_id, Meetup.ends_at > datetime.now(UTC))
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
    if meetup.starts_at > now:
        # Calling off a Meetup before it starts is Cancel (SCRUM-37).
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT, detail="Das Treffen hat noch nicht begonnen"
        )
    meetup.ends_at = now
    session.commit()
    session.refresh(meetup)
    return to_read(meetup, user)


@router.patch("/meetups/{meetup_id}", response_model=MeetupRead)
def move_meetup_start(
    meetup_id: int,
    body: MeetupTimeChange,
    user: User = Depends(current_user),
    session: Session = Depends(get_session),
):
    """The Host moves the start of a Meetup that has not started yet; the duration stays."""
    meetup = session.get(Meetup, meetup_id)
    if meetup is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Meetup not found")
    if meetup.host_id != user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Nur der Gastgeber kann die Zeit ändern",
        )
    now = datetime.now(UTC)
    if meetup.starts_at <= now:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT, detail="Das Treffen hat schon begonnen"
        )
    check_start(body.starts_at, now)
    duration = meetup.ends_at - meetup.starts_at
    meetup.starts_at = body.starts_at
    meetup.ends_at = body.starts_at + duration
    session.commit()
    session.refresh(meetup)
    return to_read(meetup, user)
