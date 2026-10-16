"""Contact Notifications (SCRUM-43, see CONTEXT.md "Contact Notification", "Invitation").

- A new Meetup or Now-meetup notifies the Host's Contacts. A weekly Series notifies them once,
  about its first Occurrence, not every week (Stefan, 2026-10-16).
- Everyone in a Meetup (the Host and each Join) can invite chosen Contacts of their own. The
  invitation opens the Meetup and offers "Ich komme mit".

Nobody gets two Notifications for one new Meetup: a Contact who also has the Place as Favorite
gets only the Contact Notification, because it names the person (Stefan, 2026-10-16). Users
blocked in either direction with the Host, or with the inviter, are never notified, so a Block
still hides where the blocker is (SCRUM-32).

This module imports only the models and the modules below them, like app.meetup_lifecycle.
"""

from datetime import datetime

from sqlalchemy import or_
from sqlmodel import Session, select

from app import meetup_lifecycle as lifecycle
from app.blocks import blocked_by, blockers_of
from app.favorite_notifications import notify_favorites
from app.models import ContactRequest, Meetup, MeetupJoin, Notification
from app.notification_events import notify_users

# At most this many Contacts in one invitation request.
MAX_INVITES = 50


def contacts_of(session: Session, user_id: int) -> set[int]:
    """The user's Contacts: accepted requests in either direction."""
    rows = session.exec(
        select(ContactRequest.requester_id, ContactRequest.addressee_id).where(
            ContactRequest.status == "accepted",
            or_(ContactRequest.requester_id == user_id, ContactRequest.addressee_id == user_id),
        )
    )
    return {a if b == user_id else b for a, b in rows}


def blocks_with(session: Session, user_id: int) -> set[int]:
    """Users blocked by `user_id` and users who blocked them."""
    return blockers_of(session, user_id) | blocked_by(session, user_id)


def notify_new_meetup(
    session: Session, meetup: Meetup, now: datetime, contacts: bool = True
) -> None:
    """A new Meetup: the Host's Contacts first (`contacts`), then the Favorites without them.
    The caller has flushed the Meetup and owns the transaction."""
    notified: set[int] = set()
    if contacts:
        notified = contacts_of(session, meetup.host_id) - blocks_with(session, meetup.host_id)
        notify_users(
            session, notified, meetup, "contact_meetup_created", now, actor_id=meetup.host_id
        )
    notify_favorites(session, meetup, now, skip=frozenset(notified))


def invite(
    session: Session, meetup: Meetup, by: int, user_ids: set[int], now: datetime
) -> int:
    """Kontakte einladen; the number of new invitations. Only someone in the Meetup invites, and
    only their own Contacts. Users already in it, already invited to it, or blocked with the
    inviter or the Host are left out without an error. The caller commits."""
    lifecycle.require_open(meetup, now)
    joined = set(session.exec(select(MeetupJoin.user_id).where(MeetupJoin.meetup_id == meetup.id)))
    if by != meetup.host_id and by not in joined:
        raise lifecycle.NotAllowed("Nur wer beim Treffen dabei ist, kann einladen")
    if not user_ids <= contacts_of(session, by):
        raise lifecycle.Invalid("Du kannst nur deine Kontakte einladen")
    invited = set(
        session.exec(
            select(Notification.user_id).where(
                Notification.meetup_id == meetup.id, Notification.kind == "meetup_invitation"
            )
        )
    )
    left_out = (
        {meetup.host_id}
        | joined
        | invited
        | blocks_with(session, by)
        | blocks_with(session, meetup.host_id)
    )
    recipients = user_ids - left_out
    notify_users(session, recipients, meetup, "meetup_invitation", now, actor_id=by)
    return len(recipients)
