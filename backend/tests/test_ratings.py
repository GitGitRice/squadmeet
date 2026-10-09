from datetime import UTC, datetime, timedelta

import pytest
from sqlmodel import select

from app.models import Place, Rating
from app.ratings import RECENT_DAYS
from tests.test_auth import auth_header, register


@pytest.fixture
def place(session):
    """A table tennis Place far away in the Atlantic, so no OSM Place is near it."""
    place = Place(
        name="Testplatte", activity_type="table_tennis", location="SRID=4326;POINT(-30.5 0.5)"
    )
    session.add(place)
    session.commit()
    return place


@pytest.fixture
def paula(client):
    """(token, user id) of a registered user."""
    body = register(client).json()
    return body["token"], body["user"]["id"]


@pytest.fixture
def karl(client):
    body = register(client, nickname="Korb_Karl").json()
    return body["token"], body["user"]["id"]


def rate(client, token, place_id, stars=4, reasons=("table_good",)):
    return client.put(
        f"/api/places/{place_id}/ratings/mine",
        json={"stars": stars, "reasons": list(reasons)},
        headers=auth_header(token),
    )


def summary(client, place_id):
    return client.get(f"/api/places/{place_id}/ratings").json()


def old_rating(session, place, user_id, reasons, days):
    """A Rating written straight into the database, last changed `days` ago."""
    when = datetime.now(UTC) - timedelta(days=days)
    session.add(
        Rating(
            place_id=place.id,
            user_id=user_id,
            stars=2,
            reasons=reasons,
            created_at=when,
            updated_at=when,
        )
    )
    session.commit()


def test_the_form_offers_the_reasons_of_the_activity_type(client, place):
    keys = [r["key"] for r in client.get(f"/api/places/{place.id}/reasons").json()]

    assert "net_missing" in keys  # table tennis
    assert "litter" in keys  # general
    assert "hoop_damaged" not in keys  # basketball


def test_rate_a_place(client, place, paula):
    response = rate(client, paula[0], place.id, stars=5, reasons=["table_good", "fixed_net"])

    assert response.status_code == 200
    assert response.json()["stars"] == 5
    assert response.json()["reasons"] == ["table_good", "fixed_net"]
    mine = client.get(f"/api/places/{place.id}/ratings/mine", headers=auth_header(paula[0]))
    assert mine.json()["stars"] == 5


def test_no_rating_of_mine_yet_is_null(client, place, paula):
    mine = client.get(f"/api/places/{place.id}/ratings/mine", headers=auth_header(paula[0]))

    assert mine.status_code == 200
    assert mine.json() is None


def test_a_rating_needs_at_least_one_reason(client, place, paula):
    assert rate(client, paula[0], place.id, reasons=[]).status_code == 422
    assert summary(client, place.id)["count"] == 0


@pytest.mark.parametrize("stars", [0, 6])
def test_stars_must_be_one_to_five(client, place, paula, stars):
    assert rate(client, paula[0], place.id, stars=stars).status_code == 422


def test_a_reason_of_another_activity_type_is_rejected(client, place, paula):
    response = rate(client, paula[0], place.id, reasons=["hoop_damaged"])

    assert response.status_code == 422
    assert "hoop_damaged" in response.json()["detail"]


def test_rating_needs_a_login(client, place):
    response = client.put(
        f"/api/places/{place.id}/ratings/mine", json={"stars": 3, "reasons": ["table_good"]}
    )

    assert response.status_code == 401


def test_rating_an_unknown_place_is_404(client, paula):
    assert rate(client, paula[0], 999_999_999).status_code == 404
    assert client.get("/api/places/999999999/ratings").status_code == 404


def test_a_second_rating_by_the_same_user_replaces_the_first(client, session, place, paula):
    rate(client, paula[0], place.id, stars=2, reasons=["net_missing"])

    rate(client, paula[0], place.id, stars=5, reasons=["table_good"])

    ratings = session.exec(select(Rating).where(Rating.place_id == place.id)).all()
    assert [(r.stars, r.reasons) for r in ratings] == [(5, ["table_good"])]
    assert summary(client, place.id)["count"] == 1


def test_a_reason_sent_twice_counts_once(client, place, paula):
    response = rate(client, paula[0], place.id, reasons=["table_good", "table_good"])

    assert response.json()["reasons"] == ["table_good"]


def test_no_ratings_yet(client, place):
    assert summary(client, place.id) == {
        "count": 0,
        "average_stars": None,
        "top_reasons": [],
        "condition": {"state": "unknown", "issues": []},
    }


def test_average_stars_and_top_reasons(client, place, paula, karl):
    rate(client, paula[0], place.id, stars=5, reasons=["table_good", "fixed_net", "shade"])
    rate(client, karl[0], place.id, stars=2, reasons=["table_good", "often_crowded"])

    result = summary(client, place.id)

    assert result["count"] == 2
    assert result["average_stars"] == 3.5
    top = result["top_reasons"]
    assert len(top) == 3
    assert top[0] == {
        "key": "table_good",
        "label": "Platte in gutem Zustand",
        "positive": True,
        "count": 2,
    }


def test_condition_is_good_when_recent_ratings_name_no_problem(client, place, paula):
    # "Oft überfüllt" is negative, but nobody has to fix it (SCRUM-18 decision).
    rate(client, paula[0], place.id, reasons=["table_good", "often_crowded"])

    assert summary(client, place.id)["condition"] == {"state": "good", "issues": []}


def test_condition_lists_the_problems_of_recent_ratings(client, place, paula, karl):
    rate(client, paula[0], place.id, stars=2, reasons=["net_missing", "litter"])
    rate(client, karl[0], place.id, stars=3, reasons=["net_missing", "table_good"])

    condition = summary(client, place.id)["condition"]

    assert condition["state"] == "issues"
    assert [(i["key"], i["count"]) for i in condition["issues"]] == [
        ("net_missing", 2),
        ("litter", 1),
    ]


def test_condition_ignores_old_ratings(client, session, place, paula, karl):
    old_rating(session, place, karl[1], ["net_missing"], days=RECENT_DAYS + 1)
    rate(client, paula[0], place.id, reasons=["table_good"])

    result = summary(client, place.id)

    # The old Rating still counts for the stars, not for the Condition.
    assert result["count"] == 2
    assert result["condition"] == {"state": "good", "issues": []}


def test_only_old_ratings_give_an_unknown_condition(client, session, place, paula):
    old_rating(session, place, paula[1], ["net_missing"], days=RECENT_DAYS + 1)

    assert summary(client, place.id)["condition"]["state"] == "unknown"


def test_changing_an_old_rating_makes_it_recent_again(client, session, place, paula):
    old_rating(session, place, paula[1], ["table_good"], days=RECENT_DAYS + 1)

    rate(client, paula[0], place.id, reasons=["net_missing"])

    assert summary(client, place.id)["condition"]["state"] == "issues"
