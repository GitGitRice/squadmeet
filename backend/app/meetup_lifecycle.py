"""The Meetup lifecycle in one place (SCRUM-61, see CONTEXT.md): what state a Meetup is in, and
every transition between states, each with the rules for who may do it.

States: upcoming (not started), live (running), ended (its time is over), cancelled (called
off before the start), closed (nobody left). Transitions: Cancel, End, Move, Join, Leave, hand
over (the Host Leaves) and call off (the system: Admin lock, a cancelled Series).

Every function takes `now`, so tests can set the clock. They raise a LifecycleError, which
app.main turns into an HTTP answer; the routes in app.meetups only translate HTTP. This module
imports only the models and app.blocks, so app.auth and app.admin_places can use it directly.
"""

from datetime import datetime, timedelta
from enum import StrEnum
from typing import Literal

from sqlalchemy import and_
from sqlmodel import Session, select

from app.blocks import blockers_of
from app.models import Meetup, MeetupJoin, MeetupSeries

# The furthest start of a later Meetup. frontend/src/places/meetupTime.ts has a copy for the
# date picker only; the server always checks.
MAX_DAYS_AHEAD = 30


class MeetupState(StrEnum):
    UPCOMING = "upcoming"
    LIVE = "live"
    ENDED = "ended"
    CANCELLED = "cancelled"
    CLOSED = "closed"


class LifecycleError(Exception):
    """A rule says no. status_code and detail become the HTTP answer (German, for the UI)."""

    status_code = 409

    def __init__(self, detail: str):
        super().__init__(detail)
        self.detail = detail


class NotAllowed(LifecycleError):
    status_code = 403


class NotFound(LifecycleError):
    status_code = 404


class Conflict(LifecycleError):
    status_code = 409


class Invalid(LifecycleError):
    status_code = 422


def state(meetup: Meetup, now: datetime) -> MeetupState:
    if meetup.closed_at is not None:
        return MeetupState.CLOSED
    if meetup.cancelled_at is not None:
        return MeetupState.CANCELLED
    if meetup.ends_at <= now:
        return MeetupState.ENDED
    if meetup.starts_at > now:
        return MeetupState.UPCOMING
    return MeetupState.LIVE


def is_open(meetup: Meetup, now: datetime) -> bool:
    """Upcoming or live: users can still join it."""
    return state(meetup, now) in (MeetupState.UPCOMING, MeetupState.LIVE)


def is_active(now: datetime):
    """SQL condition for the state live: the Meetup runs at `now` (the map's people now).

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


def is_listed(now: datetime):
    """SQL condition: upcoming, live, or cancelled but not yet over (the Place detail list)."""
    return and_(Meetup.ends_at > now, Meetup.closed_at.is_(None))


def require_open(meetup: Meetup, now: datetime) -> None:
    current = state(meetup, now)
    if current is MeetupState.CANCELLED:
        raise Conflict("Das Treffen ist abgesagt")
    if current in (MeetupState.CLOSED, MeetupState.ENDED):
        raise Conflict("Das Treffen ist schon vorbei")


def require_host(meetup: Meetup, by: int, action: str) -> None:
    if meetup.host_id != by:
        raise NotAllowed(f"Nur der Gastgeber kann {action}")


def check_start(starts_at: datetime, now: datetime) -> None:
    """A later start must be in the future and at most MAX_DAYS_AHEAD days ahead."""
    if starts_at <= now:
        raise Invalid("Der Beginn muss in der Zukunft liegen")
    if starts_at > now + timedelta(days=MAX_DAYS_AHEAD):
        raise Invalid(f"Ein Treffen kann höchstens {MAX_DAYS_AHEAD} Tage im Voraus geplant werden")


def cancel(meetup: Meetup, by: int, now: datetime) -> None:
    """Absagen: the Host calls off a Meetup before it starts. A running one is ended instead."""
    require_host(meetup, by, "das Treffen absagen")
    require_open(meetup, now)
    if state(meetup, now) is MeetupState.LIVE:
        raise Conflict("Das Treffen läuft schon, beende es stattdessen")
    meetup.cancelled_at = now


def end(meetup: Meetup, by: int, now: datetime) -> None:
    """The Host ends a running Meetup now; it leaves the map at once."""
    require_host(meetup, by, "das Treffen beenden")
    require_open(meetup, now)
    if state(meetup, now) is MeetupState.UPCOMING:
        # Calling off a Meetup before it starts is Cancel (SCRUM-37).
        raise Conflict("Das Treffen hat noch nicht begonnen")
    meetup.ends_at = now


def call_off(meetup: Meetup, now: datetime, end_running: bool = True) -> None:
    """The system calls a Meetup off (no Host check): an upcoming one is cancelled, a running
    one ended (Admin lock, SCRUM-39) or left running (a cancelled Series, SCRUM-38)."""
    current = state(meetup, now)
    if current is MeetupState.UPCOMING:
        meetup.cancelled_at = now
    elif current is MeetupState.LIVE and end_running:
        meetup.ends_at = now


def find_join(session: Session, meetup: Meetup, user_id: int) -> MeetupJoin | None:
    return session.exec(
        select(MeetupJoin).where(MeetupJoin.meetup_id == meetup.id, MeetupJoin.user_id == user_id)
    ).first()


def join(session: Session, meetup: Meetup, by: int, party_size: int, now: datetime) -> None:
    """"Ich komme mit" with a Party size. The caller commits; the unique key (meetup, user)
    still stops two requests at the same moment."""
    if meetup.host_id in blockers_of(session, by):
        # As if it did not exist: the blocked user does not see this Meetup (SCRUM-32).
        raise NotFound("Meetup not found")
    require_open(meetup, now)
    if meetup.host_id == by:
        raise Conflict("Du bist der Gastgeber dieses Treffens")
    if find_join(session, meetup, by) is not None:
        raise Conflict("Du bist schon dabei")
    session.add(MeetupJoin(meetup_id=meetup.id, user_id=by, party_size=party_size, joined_at=now))


def hand_over(session: Session, meetup: Meetup, now: datetime) -> None:
    """The Host Leaves: the earliest Join becomes Host, with their Party size and their open
    move answer. With no Join the Meetup is Closed. The caller commits."""
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


def leave(session: Session, meetup: Meetup, by: int, now: datetime) -> None:
    """The user Leaves, as Host (hand over) or with a Join. The caller commits."""
    if meetup.host_id == by:
        if state(meetup, now) is MeetupState.CLOSED:
            raise Conflict("Das Treffen ist schon vorbei")
        hand_over(session, meetup, now)
        return
    found = find_join(session, meetup, by)
    if found is None:
        raise NotFound("Du bist nicht dabei")
    session.delete(found)
    session.flush()


def hand_over_meetups_of(session: Session, user_id: int, now: datetime) -> None:
    """Before an account is deleted: each open Meetup the user hosts goes to the earliest Join
    (one without Joins is deleted with the user). The caller commits."""
    for meetup in session.exec(select(Meetup).where(Meetup.host_id == user_id)).all():
        if is_open(meetup, now):
            hand_over(session, meetup, now)
    session.flush()


def move(session: Session, meetup: Meetup, by: int, starts_at: datetime, now: datetime) -> Meetup:
    """The Host moves the start of an upcoming Meetup; the duration stays. Without Joins the
    Meetup itself moves. With Joins it stays at the old time for the others (the Host Leaves
    it) and the Host gets a new Meetup at the new time; everyone who was in is asked. Returns
    the Host's Meetup. The caller commits."""
    require_host(meetup, by, "die Zeit ändern")
    require_open(meetup, now)
    if state(meetup, now) is MeetupState.LIVE:
        raise Conflict("Das Treffen hat schon begonnen")
    check_start(starts_at, now)
    duration = meetup.ends_at - meetup.starts_at
    joins = session.exec(select(MeetupJoin).where(MeetupJoin.meetup_id == meetup.id)).all()
    if not joins:
        meetup.starts_at = starts_at
        meetup.ends_at = starts_at + duration
        return meetup
    moved = Meetup(
        place_id=meetup.place_id,
        host_id=by,
        party_size=meetup.party_size,
        starts_at=starts_at,
        ends_at=starts_at + duration,
    )
    session.add(moved)
    session.flush()
    meetup.moved_to_id = moved.id
    for each in joins:
        each.move_pending = True
    hand_over(session, meetup, now)
    return moved


def answer_move(
    session: Session, meetup: Meetup, by: int, answer: Literal["go", "stay", "leave"], now: datetime
) -> None:
    """The answer of a user who was in when the Host moved the Meetup: go along to the new
    Meetup, stay at the old time, or leave. The caller commits."""
    found = find_join(session, meetup, by)
    is_host = meetup.host_id == by
    pending = meetup.host_move_pending if is_host else found is not None and found.move_pending
    target = session.get(Meetup, meetup.moved_to_id) if meetup.moved_to_id else None
    if not pending or target is None or meetup.starts_at <= now:
        raise Conflict("Hier gibt es nichts zu beantworten")
    party_size = meetup.party_size if is_host else found.party_size
    if answer == "stay":
        if is_host:
            meetup.host_move_pending = False
        else:
            found.move_pending = False
        return
    if answer == "go":
        require_open(target, now)
        if target.host_id != by and find_join(session, target, by) is None:
            session.add(MeetupJoin(meetup_id=target.id, user_id=by, party_size=party_size, joined_at=now))
    leave(session, meetup, by, now)


Action = Literal["join", "leave", "cancel", "end", "move", "cancel_series"]


def actions(
    meetup: Meetup,
    viewer: int | None,
    joined: bool,
    now: datetime,
    series: MeetupSeries | None = None,
) -> list[Action]:
    """What the viewer may do with this Meetup now, so the UI shows only these buttons. A
    guest sees "join", which asks them to log in."""
    current = state(meetup, now)
    if current not in (MeetupState.UPCOMING, MeetupState.LIVE):
        return []
    allowed: list[Action] = []
    if viewer is None:
        allowed.append("join")
    elif meetup.host_id == viewer:
        if current is MeetupState.UPCOMING:
            allowed += ["cancel", "move"]
        else:
            allowed.append("end")
        allowed.append("leave")
    elif joined:
        allowed.append("leave")
    else:
        allowed.append("join")
    if viewer is not None and series is not None and series.host_id == viewer and series.cancelled_at is None:
        allowed.append("cancel_series")
    return allowed
