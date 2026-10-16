"""Create Notifications inside the same transaction as a Meetup event (SCRUM-40).

This module imports only models, so the Meetup lifecycle can use it without an auth cycle.
"""

from datetime import datetime
from typing import Literal

from sqlmodel import Session, select

from app.models import Meetup, MeetupJoin, Notification
from app.push_delivery import send_web_push

NotificationKind = Literal[
    "meetup_cancelled",
    "meetup_ended",
    "host_handover",
    "blocked_user_joined",
    "favorite_meetup_created",
    # SCRUM-43: a Contact made a Meetup; a Contact invited the user to one.
    "contact_meetup_created",
    "meetup_invitation",
]


def notify_users(
    session: Session,
    user_ids: set[int],
    meetup: Meetup,
    kind: NotificationKind,
    now: datetime,
    actor_id: int | None = None,
) -> None:
    """Add one Notification per recipient. The caller owns the transaction. `actor_id`: who
    caused it, for the Contact kinds (SCRUM-43)."""
    if meetup.id is None:
        raise ValueError("A Notification needs a stored Meetup")
    session.add_all(
        Notification(
            user_id=user_id, meetup_id=meetup.id, kind=kind, actor_id=actor_id, created_at=now
        )
        for user_id in user_ids
    )
    send_web_push(session, user_ids, meetup.id, meetup.place_id, kind)


def notify_joined(
    session: Session, meetup: Meetup, kind: NotificationKind, now: datetime
) -> None:
    """Notify the current Joins, not the Host and not users who already Left."""
    joined = set(
        session.exec(select(MeetupJoin.user_id).where(MeetupJoin.meetup_id == meetup.id))
    )
    notify_users(session, joined, meetup, kind, now)
