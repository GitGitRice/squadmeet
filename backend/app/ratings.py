"""Ratings (SCRUM-31): 1–5 stars and at least one Reason for a Place (see CONTEXT.md).

One Rating per user per Place; a second one replaces the first. No location check.
The Place detail shows the average stars, the most chosen Reasons and the Condition.
The Condition comes only from the Reasons that the city or the operator must fix
(`condition_issue` in app/reasons.py), and only from recent Ratings, so a repaired net stops
counting after a while.
"""

from collections import Counter
from datetime import UTC, datetime, timedelta
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy.dialects.postgresql import insert
from sqlmodel import Session, select

from app.auth import current_user
from app.db import get_session
from app.models import Place, Rating, User
from app.reasons import Reason, reasons_for

# A Rating counts for the Condition while it is at most this old (its last change).
RECENT_DAYS = 60
# How many of the most chosen Reasons the Place detail shows.
TOP_REASONS = 3

router = APIRouter(tags=["ratings"])


class ReasonRead(BaseModel):
    key: str
    label: str
    positive: bool


class ReasonCount(ReasonRead):
    count: int


class ConditionRead(BaseModel):
    # unknown = no recent Rating; good = recent Ratings name no problem; issues = they do.
    state: Literal["unknown", "good", "issues"]
    # The problems named in recent Ratings, the most named first.
    issues: list[ReasonCount]


class RatingSummary(BaseModel):
    count: int
    # None while nobody rated the Place.
    average_stars: float | None
    top_reasons: list[ReasonCount]
    condition: ConditionRead


class RatingInput(BaseModel):
    stars: int = Field(ge=1, le=5)
    reasons: list[str] = Field(min_length=1)


class RatingRead(BaseModel):
    place_id: int
    stars: int
    reasons: list[str]
    updated_at: datetime


def get_place(session: Session, place_id: int) -> Place:
    place = session.get(Place, place_id)
    if place is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Place not found")
    return place


def to_read(reason: Reason) -> ReasonRead:
    return ReasonRead(key=reason.key, label=reason.label, positive=reason.positive)


def counted(counts: Counter, reasons: dict[str, Reason]) -> list[ReasonCount]:
    """The Reasons with their counts, the most chosen first. Keys the Place's Activity type no
    longer has are left out."""
    return [
        ReasonCount(**to_read(reasons[key]).model_dump(), count=n)
        for key, n in counts.most_common()
        if key in reasons
    ]


def summarize(ratings: list[Rating], reasons: dict[str, Reason], now: datetime) -> RatingSummary:
    recent = [r for r in ratings if r.updated_at > now - timedelta(days=RECENT_DAYS)]
    issues = Counter(
        key for r in recent for key in r.reasons if key in reasons and reasons[key].affects_condition
    )
    if not recent:
        state = "unknown"
    else:
        state = "issues" if issues else "good"
    return RatingSummary(
        count=len(ratings),
        average_stars=round(sum(r.stars for r in ratings) / len(ratings), 1) if ratings else None,
        top_reasons=counted(Counter(key for r in ratings for key in r.reasons), reasons)[
            :TOP_REASONS
        ],
        condition=ConditionRead(state=state, issues=counted(issues, reasons)),
    )


@router.get("/places/{place_id}/reasons", response_model=list[ReasonRead])
def list_reasons(place_id: int, session: Session = Depends(get_session)):
    """The Reasons the rating form offers for this Place (SCRUM-18)."""
    place = get_place(session, place_id)
    return [to_read(reason) for reason in reasons_for(place.activity_type)]


@router.get("/places/{place_id}/ratings", response_model=RatingSummary)
def rating_summary(place_id: int, session: Session = Depends(get_session)):
    place = get_place(session, place_id)
    ratings = session.exec(select(Rating).where(Rating.place_id == place_id)).all()
    reasons = {reason.key: reason for reason in reasons_for(place.activity_type)}
    return summarize(list(ratings), reasons, datetime.now(UTC))


@router.get("/places/{place_id}/ratings/mine", response_model=RatingRead | None)
def my_rating(
    place_id: int,
    user: User = Depends(current_user),
    session: Session = Depends(get_session),
):
    """The user's own Rating of the Place, or null, so the form can show it for a change."""
    get_place(session, place_id)
    rating = session.exec(
        select(Rating).where(Rating.place_id == place_id, Rating.user_id == user.id)
    ).first()
    return rating and RatingRead.model_validate(rating, from_attributes=True)


@router.put("/places/{place_id}/ratings/mine", response_model=RatingRead)
def rate_place(
    place_id: int,
    body: RatingInput,
    user: User = Depends(current_user),
    session: Session = Depends(get_session),
):
    """Rate the Place, or replace the user's earlier Rating of it."""
    place = get_place(session, place_id)
    allowed = {reason.key for reason in reasons_for(place.activity_type)}
    unknown = [key for key in body.reasons if key not in allowed]
    if unknown:
        raise HTTPException(
            status_code=422,
            detail=f"Diese Begründung passt nicht zu dem Platz: {', '.join(unknown)}",
        )
    now = datetime.now(UTC)
    values = {
        "stars": body.stars,
        # dict.fromkeys drops a Reason sent twice and keeps the order.
        "reasons": list(dict.fromkeys(body.reasons)),
        "updated_at": now,
    }
    # One statement, so two requests at the same moment cannot make two Ratings.
    session.exec(
        insert(Rating)
        .values(place_id=place_id, user_id=user.id, created_at=now, **values)
        .on_conflict_do_update(constraint="uq_rating_place_user", set_=values)
    )
    session.commit()
    rating = session.exec(
        select(Rating).where(Rating.place_id == place_id, Rating.user_id == user.id)
    ).one()
    session.refresh(rating)
    return RatingRead.model_validate(rating, from_attributes=True)
