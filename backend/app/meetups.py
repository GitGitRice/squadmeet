"""Meetups at a Place, for 1–4 hours (see CONTEXT.md): a Now-meetup ("Ich bin jetzt hier",
SCRUM-29) starts at once, a later Meetup (SCRUM-35) at a start time up to 30 days ahead.

A Meetup is active while starts_at <= now < ends_at, so it disappears from the map by itself
when its time is over; nothing has to delete it. The Host can end it early, or move the start
of a Meetup that nobody joined and that has not started yet. Other users Join with their
Party size and Leave (SCRUM-34). Cancel, handover and moving with Joins are SCRUM-37.
Only logged-in users see who comes (Nicknames); guests see the number of people.
Hiding Meetups from blocked users waits for Block (SCRUM-32).
"""

from datetime import UTC, datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException, Response, status
from fastapi.security import HTTPAuthorizationCredentials
from pydantic import AwareDatetime, BaseModel, Field
from sqlalchemy import and_, func
from sqlalchemy.exc import IntegrityError
from sqlmodel import Session, select

from app.auth import bearer, current_login, current_user
from app.db import get_session
from app.models import Meetup, MeetupJoin, Place, User

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


class JoinCreate(BaseModel):
    party_size: int = Field(default=1, ge=1, le=MAX_PARTY_SIZE)


def viewer(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer),
    session: Session = Depends(get_session),
) -> User | None:
    """The logged-in user of the request, or None for a guest (no 401)."""
    try:
        login = current_login(credentials, session)
    except HTTPException:
        return None
    return session.get(User, login.user_id)


def joined_people(now: datetime):
    """SQL: the people of all active Meetups at a Place, the Host's Party and every Join.
    For the map (place_reads.py), in the same subquery style as the Place columns."""
    joins = (
        select(func.coalesce(func.sum(MeetupJoin.party_size), 0))
        .where(MeetupJoin.meetup_id == Meetup.id)
        .scalar_subquery()
    )
    return select(func.coalesce(func.sum(Meetup.party_size + joins), 0)).where(
        Meetup.place_id == Place.id, is_active(now)
    )


class HostRead(BaseModel):
    id: int
    nickname: str
    avatar: str


class ParticipantRead(HostRead):
    party_size: int


class MeetupRead(BaseModel):
    id: int
    place_id: int
    # None for a guest: only logged-in users see who comes (decided in SCRUM-34).
    host: HostRead | None
    # The Host's own Party size.
    party_size: int
    # The Host's Party plus every Join.
    people: int
    # The users who joined, the earliest first; None for a guest.
    participants: list[ParticipantRead] | None
    starts_at: datetime
    ends_at: datetime


def to_reads(session: Session, meetups: list[Meetup], user: User | None) -> list[MeetupRead]:
    """The Meetups as `user` may see them, with their Joins (two queries for any number)."""
    ids = [meetup.id for meetup in meetups]
    joins: dict[int, list[tuple[MeetupJoin, User]]] = {meetup_id: [] for meetup_id in ids}
    for join, member in session.exec(
        select(MeetupJoin, User)
        .join(User, User.id == MeetupJoin.user_id)
        .where(MeetupJoin.meetup_id.in_(ids))
        .order_by(MeetupJoin.joined_at, MeetupJoin.id)
    ).all():
        joins[join.meetup_id].append((join, member))
    hosts = {
        host.id: host
        for host in session.exec(
            select(User).where(User.id.in_({meetup.host_id for meetup in meetups}))
        ).all()
    }
    reads = []
    for meetup in meetups:
        host = hosts[meetup.host_id]
        reads.append(
            MeetupRead(
                id=meetup.id,
                place_id=meetup.place_id,
                host=None
                if user is None
                else HostRead(id=host.id, nickname=host.nickname, avatar=host.avatar),
                party_size=meetup.party_size,
                people=meetup.party_size + sum(join.party_size for join, _ in joins[meetup.id]),
                participants=None
                if user is None
                else [
                    ParticipantRead(
                        id=member.id,
                        nickname=member.nickname,
                        avatar=member.avatar,
                        party_size=join.party_size,
                    )
                    for join, member in joins[meetup.id]
                ],
                starts_at=meetup.starts_at,
                ends_at=meetup.ends_at,
            )
        )
    return reads


def to_read(session: Session, meetup: Meetup, user: User | None) -> MeetupRead:
    return to_reads(session, [meetup], user)[0]


def get_meetup(session: Session, meetup_id: int) -> Meetup:
    meetup = session.get(Meetup, meetup_id)
    if meetup is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Meetup not found")
    return meetup


@router.post("/meetups", response_model=MeetupRead, status_code=status.HTTP_201_CREATED)
def create_meetup(
    body: MeetupCreate,
    user: User = Depends(current_user),
    session: Session = Depends(get_session),
):
    """A Meetup that starts now or at `starts_at` and ends after `hours`. The creator is the
    Host."""
    place = session.get(Place, body.place_id)
    if place is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Place not found")
    # A Place suggestion may not be real; it becomes a Place with 3 Confirmations (SCRUM-36).
    if place.is_suggestion:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Dieser Platz ist noch nicht bestätigt",
        )
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
    return to_read(session, meetup, user)


@router.get("/places/{place_id}/meetups", response_model=list[MeetupRead])
def list_meetups(
    place_id: int,
    user: User | None = Depends(viewer),
    session: Session = Depends(get_session),
):
    """The active and the later Meetups at a Place, for the Place detail page. By start time,
    so the active ones come first."""
    if session.get(Place, place_id) is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Place not found")
    meetups = session.exec(
        select(Meetup)
        .where(Meetup.place_id == place_id, Meetup.ends_at > datetime.now(UTC))
        .order_by(Meetup.starts_at, Meetup.id)
    ).all()
    return to_reads(session, list(meetups), user)


@router.post("/meetups/{meetup_id}/end", response_model=MeetupRead)
def end_meetup_early(
    meetup_id: int,
    user: User = Depends(current_user),
    session: Session = Depends(get_session),
):
    """The Host ends the Meetup now; it leaves the map at once."""
    meetup = get_meetup(session, meetup_id)
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
    return to_read(session, meetup, user)


@router.patch("/meetups/{meetup_id}", response_model=MeetupRead)
def move_meetup_start(
    meetup_id: int,
    body: MeetupTimeChange,
    user: User = Depends(current_user),
    session: Session = Depends(get_session),
):
    """The Host moves the start of a Meetup that has not started yet; the duration stays."""
    meetup = get_meetup(session, meetup_id)
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
    if session.exec(select(MeetupJoin.id).where(MeetupJoin.meetup_id == meetup.id)).first():
        # Moving with Joins (go along / stay / leave) is SCRUM-37.
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Andere sind schon dabei, die Zeit kann noch nicht geändert werden",
        )
    check_start(body.starts_at, now)
    duration = meetup.ends_at - meetup.starts_at
    meetup.starts_at = body.starts_at
    meetup.ends_at = body.starts_at + duration
    session.commit()
    session.refresh(meetup)
    return to_read(session, meetup, user)


@router.post(
    "/meetups/{meetup_id}/join", response_model=MeetupRead, status_code=status.HTTP_201_CREATED
)
def join_meetup(
    meetup_id: int,
    body: JoinCreate,
    user: User = Depends(current_user),
    session: Session = Depends(get_session),
):
    """"Ich komme mit": the user joins an active or later Meetup with their Party size."""
    meetup = get_meetup(session, meetup_id)
    now = datetime.now(UTC)
    if meetup.ends_at <= now:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT, detail="Das Treffen ist schon vorbei"
        )
    if meetup.host_id == user.id:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT, detail="Du bist der Gastgeber dieses Treffens"
        )
    session.add(
        MeetupJoin(meetup_id=meetup.id, user_id=user.id, party_size=body.party_size, joined_at=now)
    )
    try:
        session.commit()
    except IntegrityError:
        # The unique key (meetup, user), so two requests at the same moment cannot both pass.
        session.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT, detail="Du bist schon dabei"
        ) from None
    return to_read(session, meetup, user)


@router.delete("/meetups/{meetup_id}/join", status_code=status.HTTP_204_NO_CONTENT)
def leave_meetup(
    meetup_id: int,
    user: User = Depends(current_user),
    session: Session = Depends(get_session),
):
    """Leave: the user takes back their Join. The Host Leaving is SCRUM-37."""
    get_meetup(session, meetup_id)
    join = session.exec(
        select(MeetupJoin).where(MeetupJoin.meetup_id == meetup_id, MeetupJoin.user_id == user.id)
    ).first()
    if join is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Du bist nicht dabei")
    session.delete(join)
    session.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)
