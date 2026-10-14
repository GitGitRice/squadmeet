from datetime import UTC, datetime, timedelta

import pytest
from sqlmodel import select

from app.models import Place, PlaceConfirmation, User
from tests.test_auth import auth_header, register

# Far away in the Atlantic, so imported OSM Places never fall near it.
LAT, LON = 0.5, -30.5
# Metres per degree of latitude near the equator (WGS 84), to put a Place a set distance north.
METRES_PER_DEGREE_LAT = 110_574


def north_of_start(metres):
    return LAT + metres / METRES_PER_DEGREE_LAT


def add_place(session, activity_type="table_tennis", metres_north=0.0, name="Platte"):
    place = Place(
        name=name,
        activity_type=activity_type,
        location=f"SRID=4326;POINT({LON} {north_of_start(metres_north)})",
    )
    session.add(place)
    session.commit()
    return place


def nearby(client, activity_type="table_tennis"):
    return client.get(
        "/api/place-suggestions/nearby",
        params={"lat": LAT, "lon": LON, "activity_type": activity_type},
    )


def suggest(client, token, **changes):
    body = {"activity_type": "table_tennis", "lat": LAT, "lon": LON} | changes
    return client.post("/api/place-suggestions", json=body, headers=auth_header(token))


def confirm(client, token, place_id, metres_north=0.0):
    return client.post(
        f"/api/place-suggestions/{place_id}/confirm",
        json={"lat": north_of_start(metres_north), "lon": LON},
        headers=auth_header(token),
    )


def user_token(client, session, nickname="Steven", age=timedelta(days=8)):
    body = register(client, nickname=nickname).json()
    user = session.get(User, body["user"]["id"])
    user.created_at = datetime.now(UTC) - age
    session.commit()
    return body["token"]


@pytest.fixture
def token(client, session):
    return user_token(client, session)


def test_a_place_49_m_away_is_a_possible_duplicate(client, session):
    place = add_place(session, metres_north=49)

    found = nearby(client).json()

    assert [p["id"] for p in found] == [place.id]
    assert found[0]["distance_m"] == 49


def test_a_place_51_m_away_is_not_a_duplicate(client, session):
    add_place(session, metres_north=51)

    assert nearby(client).json() == []


def test_only_places_of_the_same_activity_type_are_duplicates(client, session):
    add_place(session, activity_type="basketball", metres_north=5)
    table = add_place(session, activity_type="table_tennis", metres_north=10)

    assert [p["id"] for p in nearby(client, "table_tennis").json()] == [table.id]


def test_duplicates_are_sorted_nearest_first_and_include_suggestions(client, session, token):
    far = add_place(session, metres_north=30)
    suggestion = suggest(client, token, lat=north_of_start(10)).json()

    found = nearby(client).json()

    assert [p["id"] for p in found] == [suggestion["id"], far.id]
    assert found[0]["is_suggestion"] is True


def test_nearby_rejects_an_unknown_activity_type(client):
    assert nearby(client, "chess").status_code == 422


def test_suggest_needs_a_login(client):
    response = client.post(
        "/api/place-suggestions", json={"activity_type": "table_tennis", "lat": LAT, "lon": LON}
    )

    assert response.status_code == 401


def test_a_suggestion_is_on_the_map_as_unconfirmed_with_one_confirmation(client, token):
    response = suggest(client, token, name="  Platte am Teich ")

    assert response.status_code == 201
    created = response.json()
    assert created["name"] == "Platte am Teich"
    assert created["is_suggestion"] is True
    assert created["confirmations"] == 1
    on_map = client.get("/api/places", params={"bbox": "-31,0,-30,1"}).json()
    assert [(p["id"], p["is_suggestion"], p["confirmations"]) for p in on_map] == [
        (created["id"], True, 1)
    ]


def test_the_suggester_holds_the_first_confirmation(client, session, token):
    me = client.get("/api/auth/me", headers=auth_header(token)).json()

    place_id = suggest(client, token).json()["id"]

    confirmations = session.exec(
        select(PlaceConfirmation).where(PlaceConfirmation.place_id == place_id)
    ).all()
    assert [c.user_id for c in confirmations] == [me["id"]]


def test_a_suggestion_without_a_name_gets_the_activity_label(client, token):
    assert suggest(client, token, activity_type="basketball").json()["name"] == "Basketballplatz"


def test_an_osm_place_is_no_suggestion(client, session):
    place = add_place(session)

    read = client.get(f"/api/places/{place.id}").json()

    assert (read["is_suggestion"], read["confirmations"]) == (False, 0)


@pytest.mark.parametrize(
    "changes",
    [{"activity_type": "chess"}, {"lat": 91}, {"lon": -181}, {"name": "x" * 61}],
)
def test_suggest_rejects_wrong_input(client, token, changes):
    assert suggest(client, token, **changes).status_code == 422


def test_a_user_can_suggest_at_most_5_places_per_hour(client, token):
    for _ in range(5):
        assert suggest(client, token).status_code == 201

    response = suggest(client, token)

    assert response.status_code == 429
    assert "Retry-After" in response.headers


def test_no_meetup_at_a_suggestion(client, token):
    place_id = suggest(client, token).json()["id"]

    response = client.post(
        "/api/meetups", json={"place_id": place_id}, headers=auth_header(token)
    )

    assert response.status_code == 409


def test_no_rating_at_a_suggestion(client, token):
    place_id = suggest(client, token).json()["id"]

    response = client.put(
        f"/api/places/{place_id}/ratings/mine",
        json={"stars": 5, "reasons": ["table_good"]},
        headers=auth_header(token),
    )

    assert response.status_code == 409


def test_deleting_the_user_keeps_the_suggestion_but_not_the_confirmation(client, session, token):
    place_id = suggest(client, token).json()["id"]
    me = client.get("/api/auth/me", headers=auth_header(token)).json()

    session.delete(session.get(User, me["id"]))
    session.commit()
    session.expire_all()

    read = client.get(f"/api/places/{place_id}").json()
    assert (read["is_suggestion"], read["confirmations"]) == (True, 0)


def test_suggest_and_confirm_require_an_account_at_least_7_days_old(client, session, token):
    place_id = suggest(client, token).json()["id"]
    too_young = user_token(client, session, "Neuling", age=timedelta(days=6, hours=23))
    old_enough = user_token(client, session, "Erfahren", age=timedelta(days=7))

    young_suggest = suggest(client, too_young)
    young_confirm = confirm(client, too_young, place_id)

    assert young_suggest.status_code == 403
    assert "7 Tage" in young_suggest.json()["detail"]
    assert young_confirm.status_code == 403
    assert "7 Tage" in young_confirm.json()["detail"]
    assert suggest(client, old_enough).status_code == 201
    assert confirm(client, old_enough, place_id).status_code == 200


def test_confirm_at_99_m_is_accepted_and_at_101_m_is_rejected(client, session, token):
    place_id = suggest(client, token).json()["id"]
    other = user_token(client, session, "Stefan")

    too_far = confirm(client, other, place_id, metres_north=101)
    near_enough = confirm(client, other, place_id, metres_north=99)

    assert too_far.status_code == 400
    assert "100 m" in too_far.json()["detail"]
    assert near_enough.status_code == 200
    assert near_enough.json()["confirmations"] == 2
    assert near_enough.json()["is_suggestion"] is True


def test_a_user_can_confirm_a_suggestion_only_once(client, session, token):
    place_id = suggest(client, token).json()["id"]
    other = user_token(client, session, "Stefan")

    assert confirm(client, token, place_id).status_code == 409
    assert confirm(client, other, place_id).status_code == 200
    second_try = confirm(client, other, place_id)

    assert second_try.status_code == 409
    assert client.get(f"/api/places/{place_id}").json()["confirmations"] == 2


def test_at_3_confirmations_a_suggestion_waits_for_an_admin(client, session, token):
    place_id = suggest(client, token).json()["id"]
    second = user_token(client, session, "Stefan")
    third = user_token(client, session, "Dominik")
    fourth = user_token(client, session, "Paula")

    after_two = confirm(client, second, place_id).json()
    after_three = confirm(client, third, place_id).json()

    assert (after_two["waiting_for_admin"], after_two["confirmations"]) == (False, 2)
    assert (after_three["is_suggestion"], after_three["confirmations"]) == (True, 3)
    assert after_three["waiting_for_admin"] is True
    read = client.get(f"/api/places/{place_id}").json()
    assert (read["is_suggestion"], read["waiting_for_admin"]) == (True, True)
    fourth_try = confirm(client, fourth, place_id)
    assert fourth_try.status_code == 409
    assert "Freigabe" in fourth_try.json()["detail"]
    assert (
        client.post(
            "/api/meetups", json={"place_id": place_id}, headers=auth_header(token)
        ).status_code
        == 409
    )
    assert (
        client.put(
            f"/api/places/{place_id}/ratings/mine",
            json={"stars": 5, "reasons": ["table_good"]},
            headers=auth_header(token),
        ).status_code
        == 409
    )


def test_a_suggestion_records_when_it_was_suggested(client, session, token):
    before = datetime.now(UTC)

    place_id = suggest(client, token).json()["id"]

    place = session.get(Place, place_id)
    assert before <= place.suggested_at <= datetime.now(UTC)
    assert place.confirmed_at is None


def test_confirm_needs_a_login_and_an_existing_suggestion(client, session, token):
    osm_place = add_place(session)

    assert (
        client.post(
            f"/api/place-suggestions/{osm_place.id}/confirm", json={"lat": LAT, "lon": LON}
        ).status_code
        == 401
    )
    assert confirm(client, token, 999_999_999).status_code == 404
    assert confirm(client, token, osm_place.id).status_code == 409

