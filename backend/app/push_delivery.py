"""Best-effort Web Push delivery for durable in-app Notifications (SCRUM-44)."""

import json
import logging
import os
from typing import Literal

from pywebpush import webpush
from sqlmodel import Session, select

from app.models import PushSubscription

logger = logging.getLogger(__name__)

PushKind = Literal[
    "meetup_cancelled",
    "meetup_ended",
    "host_handover",
    "blocked_user_joined",
    "favorite_meetup_created",
    "contact_meetup_created",
    "meetup_invitation",
]

MESSAGES: dict[PushKind, str] = {
    "meetup_cancelled": "Ein Treffen wurde abgesagt.",
    "meetup_ended": "Ein Treffen wurde beendet.",
    "host_handover": "Du bist jetzt Gastgeber eines Treffens.",
    "blocked_user_joined": "Eine blockierte Person ist einem deiner Treffen beigetreten.",
    "favorite_meetup_created": "An einem deiner Favoriten wurde ein neues Treffen erstellt.",
    "contact_meetup_created": "Ein Kontakt hat ein neues Treffen erstellt.",
    "meetup_invitation": "Du wurdest zu einem Treffen eingeladen.",
}


def send_web_push(
    session: Session,
    user_ids: set[int],
    meetup_id: int,
    place_id: int,
    kind: PushKind,
) -> None:
    """Send immediately, but never let a Push provider break the app transaction."""
    private_key = os.environ.get("VAPID_PRIVATE_KEY")
    if not private_key or not user_ids:
        return
    subject = os.environ.get("VAPID_SUBJECT", "mailto:admin@squadmeet.duckdns.org")
    subscriptions = session.exec(
        select(PushSubscription).where(PushSubscription.user_id.in_(user_ids))
    ).all()
    payload = json.dumps(
        {
            "title": "SquadMeet",
            "body": MESSAGES[kind],
            "url": f"/platz/{place_id}#treffen-{meetup_id}",
            "tag": f"meetup-{meetup_id}-{kind}",
        }
    )
    for subscription in subscriptions:
        try:
            webpush(
                subscription_info={
                    "endpoint": subscription.endpoint,
                    "keys": {"p256dh": subscription.p256dh, "auth": subscription.auth},
                },
                data=payload,
                vapid_private_key=private_key,
                vapid_claims={"sub": subject},
                timeout=5,
                ttl=24 * 60 * 60,
            )
        except Exception as error:  # Push providers fail independently of the app request.
            response = getattr(error, "response", None)
            if getattr(response, "status_code", None) in {404, 410}:
                session.delete(subscription)
            else:
                logger.warning(
                    "Web Push delivery failed for subscription %s: %s", subscription.id, error
                )
