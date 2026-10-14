"""Who blocked whom (SCRUM-32): two queries that the Meetup rules and the Contacts need.

This module imports only the models, so app.meetup_lifecycle can use it without an import
cycle through app.auth.
"""

from sqlmodel import Session, select

from app.models import UserBlock


def blockers_of(session: Session, user_id: int | None) -> set[int]:
    """The users who blocked `user_id`: their Meetups and Nicknames are hidden from them."""
    if user_id is None:
        return set()
    return set(session.exec(select(UserBlock.blocker_id).where(UserBlock.blocked_id == user_id)))


def blocked_by(session: Session, user_id: int | None) -> set[int]:
    """The users `user_id` blocked."""
    if user_id is None:
        return set()
    return set(session.exec(select(UserBlock.blocked_id).where(UserBlock.blocker_id == user_id)))
