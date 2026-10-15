"""The signed-in user's in-app Notification list (SCRUM-40)."""

from datetime import UTC, datetime
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException, Response, status
from pydantic import BaseModel
from sqlmodel import Session, select

from app.auth import current_user
from app.db import get_session
from app.models import Meetup, Notification, Place, User

router = APIRouter(prefix="/notifications", tags=["notifications"])


class NotificationRead(BaseModel):
    id: int
    kind: Literal[
        "meetup_cancelled", "meetup_ended", "host_handover", "blocked_user_joined"
    ]
    meetup_id: int
    place_id: int
    place_name: str
    place_address: str | None
    created_at: datetime
    read: bool


@router.get("", response_model=list[NotificationRead])
def list_notifications(
    user: User = Depends(current_user), session: Session = Depends(get_session)
):
    """Newest first; a Notification stays until the account or Meetup is deleted."""
    rows = session.exec(
        select(Notification, Meetup.place_id, Place.name, Place.address)
        .join(Meetup, Meetup.id == Notification.meetup_id)
        .join(Place, Place.id == Meetup.place_id)
        .where(Notification.user_id == user.id)
        .order_by(Notification.created_at.desc(), Notification.id.desc())
    ).all()
    return [
        NotificationRead(
            id=notice.id,
            kind=notice.kind,
            meetup_id=notice.meetup_id,
            place_id=place_id,
            place_name=place_name,
            place_address=place_address,
            created_at=notice.created_at,
            read=notice.read_at is not None,
        )
        for notice, place_id, place_name, place_address in rows
    ]


@router.post("/{notification_id}/read", status_code=status.HTTP_204_NO_CONTENT)
def mark_notification_read(
    notification_id: int,
    user: User = Depends(current_user),
    session: Session = Depends(get_session),
):
    """A tap marks only the signed-in user's Notification as read."""
    notice = session.exec(
        select(Notification).where(
            Notification.id == notification_id, Notification.user_id == user.id
        )
    ).first()
    if notice is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Notification not found")
    if notice.read_at is None:
        notice.read_at = datetime.now(UTC)
        session.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)
