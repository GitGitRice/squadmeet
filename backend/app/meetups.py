"""Meetups at a Place, for 1–4 hours (see CONTEXT.md): a Now-meetup ("Ich bin jetzt hier",
SCRUM-29) starts at once, a later Meetup (SCRUM-35) at a start time up to 30 days ahead.

A Meetup is active while starts_at <= now < ends_at, so it disappears from the map by itself
when its time is over; nothing has to delete it. The Host can end it early, or move the start
of a Meetup that has not started yet. Other users Join with their Party size and Leave
(SCRUM-34). SCRUM-37: the Host can Cancel a Meetup before it starts (it stays listed as
cancelled), or Leave: the earliest Join becomes Host, and with nobody left it is Closed.
Moving a Meetup that others joined keeps it at the old time for them (handover) and gives the
Host a new Meetup at the new time; everyone who was in chooses go along / stay / leave.
Only logged-in users see who comes (Nicknames); guests see the number of people.
Hiding Meetups from blocked users waits for Block (SCRUM-32).
"""

from datetime import UTC, datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException, Response, status
from fastapi.security import HTTPAuthorizationCredentials
from typing import Literal

from pydantic import AwareDatetime, BaseModel, Field
from sqlalchemy import and_, func
from sqlalchemy.exc import IntegrityError
from sqlmodel import Session, select

from app.auth import bearer, current_login, current_user
from app.db import get_session
from app.models import Meetup, MeetupJoin, Place, User
from app.places import get_visible_place

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
    return and_(
        Meetup.starts_at <= now,
        Meetup.ends_at > now,
        Meetup.cancelled_at.is_(None),
        Meetup.closed_at.is_(None),
    )


def is_open(meetup: Meetup, now: datetime) -> bool:
    """Not over, not cancelled, not closed: users can still join it."""
    return meetup.ends_at > now and meetup.cancelled_at is None and meetup.closed_at is None


def check_open(meetup: Meetup, now: datetime) -> None:
    if meetup.cancelled_at is not None:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Das Treffen ist abgesagt")
    if meetup.closed_at is not None or meetup.ends_at <= now:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT, detail="Das Treffen ist schon vorbei"
        )


def check_host(meetup: Meetup, user: User, action: str) -> None:
    if meetup.host_id != user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail=f"Nur der Gastgeber kann {action}"
        )


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


class MoveAnswer(BaseModel):
    # go = mitgehen, stay = hierbleiben, leave = absagen
    answer: Literal["go", "stay", "leave"]


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
    cancelled: bool
    # For the viewer only: the Host moved this Meetup, and the viewer has not answered yet.
    move_offer: "MoveOfferRead | None"


class MoveOfferRead(BaseModel):
    meetup_id: int
    host: HostRead
    starts_at: datetime
    ends_at: datetime


def move_offer(session: Session, meetup: Meetup, user: User | None, joins, now: datetime):
    """The offer "go along / stay / leave" for `user`, while the old time has not started."""
    if user is None or meetup.moved_to_id is None or meetup.starts_at <= now:
        return None
    if meetup.host_id == user.id:
        pending = meetup.host_move_pending
    else:
        pending = any(join.move_pending for join, member in joins if member.id == user.id)
    target = session.get(Meetup, meetup.moved_to_id) if pending else None
    if target is None or not is_open(target, now):
        return None
    host = session.get(User, target.host_id)
    return MoveOfferRead(
        meetup_id=target.id,
        host=HostRead(id=host.id, nickname=host.nickname, avatar=host.avatar),
        starts_at=target.starts_at,
        ends_at=target.ends_at,
    )


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
    now = datetime.now(UTC)
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
                cancelled=meetup.cancelled_at is not None,
                move_offer=move_offer(session, meetup, user, joins[meetup.id], now),
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
    place = get_visible_place(session, body.place_id)
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
    get_visible_place(session, place_id)
    meetups = session.exec(
        select(Meetup)
        .where(
            Meetup.place_id == place_id,
            Meetup.ends_at > datetime.now(UTC),
            Meetup.closed_at.is_(None),
        )
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
    check_host(meetup, user, "das Treffen beenden")
    now = datetime.now(UTC)
    check_open(meetup, now)
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
    """The Host moves the start of a Meetup that has not started yet; the duration stays.

    With Joins the Meetup stays at the old time for the others: the Host Leaves it (handover)
    and gets a new Meetup at the new time. The answer is the Host's Meetup.
    """
    meetup = get_meetup(session, meetup_id)
    check_host(meetup, user, "die Zeit ändern")
    now = datetime.now(UTC)
    check_open(meetup, now)
    if meetup.starts_at <= now:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT, detail="Das Treffen hat schon begonnen"
        )
    check_start(body.starts_at, now)
    duration = meetup.ends_at - meetup.starts_at
    joins = session.exec(select(MeetupJoin).where(MeetupJoin.meetup_id == meetup.id)).all()
    if not joins:
        meetup.starts_at = body.starts_at
        meetup.ends_at = body.starts_at + duration
        session.commit()
        session.refresh(meetup)
        return to_read(session, meetup, user)
    moved = Meetup(
        place_id=meetup.place_id,
        host_id=user.id,
        party_size=meetup.party_size,
        starts_at=body.starts_at,
        ends_at=body.starts_at + duration,
    )
    session.add(moved)
    session.flush()
    meetup.moved_to_id = moved.id
    for join in joins:
        join.move_pending = True
    host_leaves(session, meetup, now)
    session.commit()
    session.refresh(moved)
    return to_read(session, moved, user)


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
    check_open(meetup, now)
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
    """Leave: the user takes back their Join. The Host Leaving hands the Meetup over to the
    earliest Join, or Closes it when nobody is left (SCRUM-37)."""
    meetup = get_meetup(session, meetup_id)
    leave(session, meetup, user, datetime.now(UTC))
    session.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)


def host_leaves(session: Session, meetup: Meetup, now: datetime) -> None:
    """The earliest Join becomes Host, with their Party size and their open move answer.
    With no Join the Meetup is Closed. The caller commits."""
    first = session.exec(
        select(MeetupJoin)
        .where(MeetupJoin.meetup_id == meetup.id)
        .order_by(MeetupJoin.joined_at, MeetupJoin.id)
    ).first()
    if first is None:
        meetup.closed_at = now
        meetup.host_move_pending = False
        return
    meetup.host_id = first.user_id
    meetup.party_size = first.party_size
    meetup.host_move_pending = first.move_pending
    session.delete(first)


def leave(session: Session, meetup: Meetup, user: User, now: datetime) -> None:
    """The user Leaves the Meetup, as Host or with a Join. The caller commits."""
    if meetup.host_id == user.id:
        if meetup.closed_at is not None:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT, detail="Das Treffen ist schon vorbei"
            )
        host_leaves(session, meetup, now)
        return
    join = session.exec(
        select(MeetupJoin).where(MeetupJoin.meetup_id == meetup.id, MeetupJoin.user_id == user.id)
    ).first()
    if join is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Du bist nicht dabei")
    session.delete(join)
    session.flush()


def hand_over_meetups_of(session: Session, user: User) -> None:
    """Before an account is deleted: each open Meetup the user hosts goes to the earliest Join
    (one without Joins is deleted with the user). The caller commits."""
    now = datetime.now(UTC)
    for meetup in session.exec(select(Meetup).where(Meetup.host_id == user.id)).all():
        if is_open(meetup, now):
            host_leaves(session, meetup, now)
    session.flush()


@router.post("/meetups/{meetup_id}/cancel", response_model=MeetupRead)
def cancel_meetup(
    meetup_id: int,
    user: User = Depends(current_user),
    session: Session = Depends(get_session),
):
    """Absagen: the Host calls off a Meetup before it starts, for everyone. It stays listed as
    cancelled until its end time, so the users who joined see it. A running Meetup is ended
    with /end instead."""
    meetup = get_meetup(session, meetup_id)
    check_host(meetup, user, "das Treffen absagen")
    now = datetime.now(UTC)
    check_open(meetup, now)
    if meetup.starts_at <= now:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Das Treffen läuft schon, beende es stattdessen",
        )
    meetup.cancelled_at = now
    session.commit()
    session.refresh(meetup)
    return to_read(session, meetup, user)


@router.post("/meetups/{meetup_id}/move-answer", response_model=MeetupRead)
def answer_move(
    meetup_id: int,
    body: MoveAnswer,
    user: User = Depends(current_user),
    session: Session = Depends(get_session),
):
    """The answer of a user who was in when the Host moved the Meetup: go along to the new
    Meetup, stay at the old time, or leave. The answer is the old Meetup."""
    meetup = get_meetup(session, meetup_id)
    now = datetime.now(UTC)
    join = session.exec(
        select(MeetupJoin).where(MeetupJoin.meetup_id == meetup.id, MeetupJoin.user_id == user.id)
    ).first()
    is_host = meetup.host_id == user.id
    pending = meetup.host_move_pending if is_host else join is not None and join.move_pending
    target = session.get(Meetup, meetup.moved_to_id) if meetup.moved_to_id else None
    if not pending or target is None or meetup.starts_at <= now:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT, detail="Hier gibt es nichts zu beantworten"
        )
    party_size = meetup.party_size if is_host else join.party_size
    if body.answer == "stay":
        if is_host:
            meetup.host_move_pending = False
        else:
            join.move_pending = False
    else:
        if body.answer == "go":
            check_open(target, now)
            if target.host_id != user.id and not session.exec(
                select(MeetupJoin.id).where(
                    MeetupJoin.meetup_id == target.id, MeetupJoin.user_id == user.id
                )
            ).first():
                session.add(
                    MeetupJoin(
                        meetup_id=target.id, user_id=user.id, party_size=party_size, joined_at=now
                    )
                )
        leave(session, meetup, user, now)
    session.commit()
    session.refresh(meetup)
    return to_read(session, meetup, user)
