"""The Place status table (SCRUM-60): each status × each use, through require() and through the
SQL filter allowed_in(), against one expected table."""

from datetime import UTC, datetime

import pytest
from fastapi import HTTPException
from sqlmodel import select

from app.models import Place, PlaceReport, User
from app.place_status import PlaceStatus, PlaceUse, allowed_in, get_status, require, view_use

NOT_FOUND = (404, "Place not found")
NOT_CONFIRMED = (409, "Dieser Platz ist noch nicht bestätigt")
ALREADY_CONFIRMED = (409, "Dieser Platz ist schon bestätigt.")
ENOUGH_CONFIRMATIONS = (
    409,
    "Dieser Platzvorschlag hat genug Bestätigungen und wartet auf die Freigabe durch einen Admin.",
)
NOT_WAITING = (409, "Dieser Platz wartet nicht auf eine Freigabe")
OK = None

ACTIVE, SUGGESTION, WAITING, REPORTED, LOCKED, DELETED = PlaceStatus

EXPECTED = {
    PlaceUse.VIEW: {
        ACTIVE: OK,
        SUGGESTION: OK,
        WAITING: OK,
        REPORTED: NOT_FOUND,
        LOCKED: NOT_FOUND,
        DELETED: NOT_FOUND,
    },
    PlaceUse.REVIEW: {
        ACTIVE: OK,
        SUGGESTION: OK,
        WAITING: OK,
        REPORTED: OK,
        LOCKED: NOT_FOUND,
        DELETED: NOT_FOUND,
    },
    PlaceUse.MAP: {
        ACTIVE: OK,
        SUGGESTION: OK,
        WAITING: OK,
        REPORTED: NOT_FOUND,
        LOCKED: NOT_FOUND,
        DELETED: NOT_FOUND,
    },
    PlaceUse.MEETUP: {
        ACTIVE: OK,
        SUGGESTION: NOT_CONFIRMED,
        WAITING: NOT_CONFIRMED,
        REPORTED: NOT_FOUND,
        LOCKED: NOT_FOUND,
        DELETED: NOT_FOUND,
    },
    PlaceUse.RATE: {
        ACTIVE: OK,
        SUGGESTION: NOT_CONFIRMED,
        WAITING: NOT_CONFIRMED,
        REPORTED: NOT_FOUND,
        LOCKED: NOT_FOUND,
        DELETED: NOT_FOUND,
    },
    PlaceUse.CONFIRM: {
        ACTIVE: ALREADY_CONFIRMED,
        SUGGESTION: OK,
        WAITING: ENOUGH_CONFIRMATIONS,
        REPORTED: NOT_FOUND,
        LOCKED: NOT_FOUND,
        DELETED: NOT_FOUND,
    },
    PlaceUse.REPORT: {
        ACTIVE: OK,
        SUGGESTION: OK,
        WAITING: OK,
        REPORTED: NOT_FOUND,
        LOCKED: NOT_FOUND,
        DELETED: NOT_FOUND,
    },
    PlaceUse.APPROVE: {
        ACTIVE: NOT_WAITING,
        SUGGESTION: NOT_WAITING,
        WAITING: OK,
        REPORTED: NOT_WAITING,
        LOCKED: NOT_WAITING,
        DELETED: NOT_FOUND,
    },
    PlaceUse.ADMIN: {
        ACTIVE: OK,
        SUGGESTION: OK,
        WAITING: OK,
        REPORTED: OK,
        LOCKED: OK,
        DELETED: NOT_FOUND,
    },
}

NOW = datetime.now(UTC)
# The columns behind each status. A Place with two flags gets the stronger status.
COLUMNS = {
    "active": ({}, ACTIVE),
    "suggestion": ({"is_suggestion": True}, SUGGESTION),
    "waiting": ({"is_suggestion": True, "confirmed_at": NOW}, WAITING),
    # An approved Place keeps confirmed_at; is_suggestion = false makes it active.
    "approved": ({"confirmed_at": NOW, "approved_at": NOW}, ACTIVE),
    "locked waiting": ({"is_suggestion": True, "confirmed_at": NOW, "locked_at": NOW}, LOCKED),
    "locked": ({"locked_at": NOW}, LOCKED),
    "locked suggestion": ({"is_suggestion": True, "locked_at": NOW}, LOCKED),
    "deleted": ({"deleted_at": NOW}, DELETED),
    # Open Place reports from 3 different users (SCRUM-57); "reports" is not a column.
    "two reports": ({"reports": 2}, ACTIVE),
    "reported": ({"reports": 3}, REPORTED),
    "three closed reports": ({"reports": 3, "closed": True}, ACTIVE),
    # A Place suggestion stays a suggestion; the Admin approval guards it already.
    "reported suggestion": ({"is_suggestion": True, "reports": 3}, SUGGESTION),
    "reported waiting": ({"is_suggestion": True, "confirmed_at": NOW, "reports": 3}, WAITING),
    "locked reported": ({"locked_at": NOW, "reports": 3}, LOCKED),
    "deleted locked suggestion": (
        {"is_suggestion": True, "locked_at": NOW, "deleted_at": NOW},
        DELETED,
    ),
}

CASES = [
    pytest.param(columns, status, use, id=f"{name}-{use.value}")
    for name, (columns, status) in COLUMNS.items()
    for use in PlaceUse
]


def make_place(session, reports=0, closed=False, **columns):
    place = Place(
        name="Statusplatte",
        activity_type="table_tennis",
        location="SRID=4326;POINT(-30.5 0.5)",
        **columns,
    )
    session.add(place)
    session.commit()
    for n in range(reports):
        user = User(nickname=f"Melder_{n}", password_hash="-", avatar="fox", created_at=NOW)
        session.add(user)
        session.flush()
        session.add(
            PlaceReport(
                place_id=place.id,
                user_id=user.id,
                reason="dangerous",
                created_at=NOW,
                closed_at=NOW if closed else None,
            )
        )
    session.commit()
    return place


def test_the_table_has_a_cell_for_each_status_and_use():
    assert set(EXPECTED) == set(PlaceUse)
    assert all(set(row) == set(PlaceStatus) for row in EXPECTED.values())


@pytest.mark.parametrize(("columns", "status"), [c for c in COLUMNS.values()], ids=list(COLUMNS))
def test_the_status_comes_from_the_columns(session, columns, status):
    place = make_place(session, **columns)

    assert get_status(session, place.id) == status


@pytest.mark.parametrize(("columns", "status", "use"), CASES)
def test_require_follows_the_table(session, columns, status, use):
    place = make_place(session, **columns)
    expected = EXPECTED[use][status]

    if expected is OK:
        assert require(session, place.id, use).id == place.id
    else:
        with pytest.raises(HTTPException) as error:
            require(session, place.id, use)
        assert (error.value.status_code, error.value.detail) == expected


@pytest.mark.parametrize(("columns", "status", "use"), CASES)
def test_the_sql_filter_follows_the_table(session, columns, status, use):
    place = make_place(session, **columns)

    found = session.exec(select(Place.id).where(Place.id == place.id, allowed_in(use))).first()

    assert (found is not None) == (EXPECTED[use][status] is OK)


@pytest.mark.parametrize("use", list(PlaceUse))
def test_a_missing_place_is_not_found_for_every_use(session, use):
    with pytest.raises(HTTPException) as error:
        require(session, 2_000_000_000, use)

    assert (error.value.status_code, error.value.detail) == NOT_FOUND
    assert get_status(session, 2_000_000_000) is None


def test_only_an_admin_with_mfa_may_review_a_reported_place():
    assert view_use(None) is PlaceUse.VIEW
    assert view_use(User(nickname="Paula", is_admin=False)) is PlaceUse.VIEW
    assert view_use(User(nickname="Anna", is_admin=True)) is PlaceUse.VIEW
    assert view_use(User(nickname="Anna", is_admin=True, mfa_enabled_at=NOW)) is PlaceUse.REVIEW
