from datetime import UTC, datetime, timedelta
from zoneinfo import ZoneInfo

import pytest

from app.models import Meetup, Place
from tests.test_auth import auth_header, register


@pytest.fixture
def place(session):
    """A Place far away in the Atlantic, so no OSM Place is near it."""
    place = Place(
        name="Testplatte", activity_type="table_tennis", location="SRID=4326;POINT(-30.5 0.5)"
    )
    session.add(place)
    session.commit()
    return place


@pytest.fixture
def host(client):
    """(token, user id) of a registered user."""
    body = register(client).json()
    return body["token"], body["user"]["id"]


@pytest.fixture
def guest(client):
    body = register(client, nickname="Korb_Karl").json()
    return body["token"], body["user"]["id"]


def create(client, token, place_id, **changes):
    return client.post(
        "/api/meetups", json={"place_id": place_id} | changes, headers=auth_header(token)
    )


def meetups_at(client, place_id):
    return client.get(f"/api/places/{place_id}/meetups").json()


def people_now(client, place_id):
    places = client.get("/api/places", params={"bbox": "-31,0,-30,1"}).json()
    return next(p["people_now"] for p in places if p["id"] == place_id)


def test_create_a_now_meetup_with_the_creator_as_host(client, place, host):
    token, user_id = host

    response = create(client, token, place.id, hours=3, party_size=2)

    assert response.status_code == 201
    meetup = response.json()
    assert meetup["host"]["id"] == user_id
    assert meetup["host"]["nickname"] == "Pingpong_Paula"
    assert meetup["party_size"] == 2
    starts = datetime.fromisoformat(meetup["starts_at"])
    ends = datetime.fromisoformat(meetup["ends_at"])
    assert ends - starts == timedelta(hours=3)
    assert abs(datetime.now(UTC) - starts) < timedelta(minutes=1)


def test_defaults_are_two_hours_and_party_size_one(client, place, host):
    meetup = create(client, host[0], place.id).json()

    ends = datetime.fromisoformat(meetup["ends_at"])
    assert ends - datetime.fromisoformat(meetup["starts_at"]) == timedelta(hours=2)
    assert meetup["party_size"] == 1


@pytest.mark.parametrize("hours", [0, 5, -1])
def test_duration_must_be_one_to_four_hours(client, place, host, hours):
    assert create(client, host[0], place.id, hours=hours).status_code == 422


@pytest.mark.parametrize("hours", [1, 4])
def test_one_and_four_hours_are_allowed(client, place, host, hours):
    assert create(client, host[0], place.id, hours=hours).status_code == 201


@pytest.mark.parametrize("party_size", [0, 11])
def test_party_size_must_be_one_to_ten(client, place, host, party_size):
    assert create(client, host[0], place.id, party_size=party_size).status_code == 422


@pytest.mark.parametrize("party_size", [1, 10])
def test_party_sizes_one_and_ten_are_allowed(client, place, host, party_size):
    assert create(client, host[0], place.id, party_size=party_size).status_code == 201


def test_creating_needs_a_login(client, place):
    assert client.post("/api/meetups", json={"place_id": place.id}).status_code == 401


def test_creating_at_an_unknown_place_is_404(client, host):
    assert create(client, host[0], 999_999_999).status_code == 404


def test_the_place_detail_lists_its_active_meetups(client, place, host):
    create(client, host[0], place.id, party_size=3)

    meetups = meetups_at(client, place.id)

    assert [m["party_size"] for m in meetups] == [3]


def test_the_map_marks_places_with_people_there_now(client, place, host, guest):
    assert people_now(client, place.id) == 0

    create(client, host[0], place.id, party_size=3)
    create(client, guest[0], place.id, party_size=2)

    assert people_now(client, place.id) == 5


def test_a_meetup_disappears_after_its_duration(client, session, place, host):
    # Written straight into the database: a Meetup whose two hours are over.
    now = datetime.now(UTC)
    session.add(
        Meetup(
            place_id=place.id,
            host_id=host[1],
            party_size=4,
            starts_at=now - timedelta(hours=3),
            ends_at=now - timedelta(hours=1),
        )
    )
    session.commit()

    assert meetups_at(client, place.id) == []
    assert people_now(client, place.id) == 0


def test_the_host_can_end_the_meetup_early(client, place, host):
    meetup = create(client, host[0], place.id).json()

    response = client.post(f"/api/meetups/{meetup['id']}/end", headers=auth_header(host[0]))

    assert response.status_code == 200
    assert meetups_at(client, place.id) == []
    assert people_now(client, place.id) == 0


def test_only_the_host_can_end_the_meetup(client, place, host, guest):
    meetup = create(client, host[0], place.id).json()

    response = client.post(f"/api/meetups/{meetup['id']}/end", headers=auth_header(guest[0]))

    assert response.status_code == 403
    assert len(meetups_at(client, place.id)) == 1


def test_an_ended_meetup_cannot_end_again(client, place, host):
    meetup = create(client, host[0], place.id).json()
    client.post(f"/api/meetups/{meetup['id']}/end", headers=auth_header(host[0]))

    response = client.post(f"/api/meetups/{meetup['id']}/end", headers=auth_header(host[0]))

    assert response.status_code == 409


def test_meetups_of_an_unknown_place_is_404(client):
    assert client.get("/api/places/999999999/meetups").status_code == 404


# Later Meetups (SCRUM-35): a start time in the future, at most 30 days ahead.


def later(**delta) -> str:
    """An ISO time with time zone, `delta` from now (e.g. later(days=2))."""
    return (datetime.now(UTC) + timedelta(**delta)).isoformat()


def test_create_a_later_meetup(client, place, host):
    starts_at = datetime.now(UTC) + timedelta(days=2)

    response = create(client, host[0], place.id, starts_at=starts_at.isoformat(), hours=3)

    assert response.status_code == 201
    meetup = response.json()
    starts = datetime.fromisoformat(meetup["starts_at"])
    assert abs(starts - starts_at) < timedelta(seconds=1)
    assert datetime.fromisoformat(meetup["ends_at"]) - starts == timedelta(hours=3)


def test_a_berlin_time_is_the_same_moment_in_utc(client, place, host):
    # 18:00 in Berlin is 16:00 or 17:00 UTC, depending on summer time.
    berlin = (datetime.now(UTC) + timedelta(days=3)).astimezone(ZoneInfo("Europe/Berlin"))
    berlin = berlin.replace(hour=18, minute=0, second=0, microsecond=0)

    meetup = create(client, host[0], place.id, starts_at=berlin.isoformat()).json()

    starts = datetime.fromisoformat(meetup["starts_at"])
    assert starts == berlin
    assert starts.astimezone(UTC).hour == 18 - berlin.utcoffset().seconds // 3600


def test_a_start_time_without_time_zone_is_rejected(client, place, host):
    naive = (datetime.now(UTC) + timedelta(days=1)).replace(tzinfo=None).isoformat()

    assert create(client, host[0], place.id, starts_at=naive).status_code == 422


def test_a_start_time_in_the_past_is_rejected(client, place, host):
    response = create(client, host[0], place.id, starts_at=later(minutes=-5))

    assert response.status_code == 422


def test_a_start_time_more_than_30_days_ahead_is_rejected(client, place, host):
    assert create(client, host[0], place.id, starts_at=later(days=30, hours=1)).status_code == 422
    assert create(client, host[0], place.id, starts_at=later(days=29, hours=23)).status_code == 201


def test_a_later_meetup_is_listed_after_the_active_ones(client, place, host, guest):
    create(client, host[0], place.id, starts_at=later(days=1), party_size=2)
    create(client, guest[0], place.id, party_size=1)

    meetups = meetups_at(client, place.id)

    assert [m["party_size"] for m in meetups] == [1, 2]


def test_a_later_meetup_does_not_count_as_people_there_now(client, place, host):
    create(client, host[0], place.id, starts_at=later(hours=2), party_size=4)

    assert people_now(client, place.id) == 0


def test_a_later_meetup_cannot_be_ended_before_it_starts(client, place, host):
    meetup = create(client, host[0], place.id, starts_at=later(days=1)).json()

    response = client.post(f"/api/meetups/{meetup['id']}/end", headers=auth_header(host[0]))

    assert response.status_code == 409
    assert len(meetups_at(client, place.id)) == 1


def change_time(client, token, meetup_id, starts_at):
    return client.patch(
        f"/api/meetups/{meetup_id}", json={"starts_at": starts_at}, headers=auth_header(token)
    )


def test_the_host_can_move_the_start_and_the_duration_stays(client, place, host):
    meetup = create(client, host[0], place.id, starts_at=later(days=1), hours=3).json()
    new_start = datetime.now(UTC) + timedelta(days=2)

    response = change_time(client, host[0], meetup["id"], new_start.isoformat())

    assert response.status_code == 200
    moved = response.json()
    starts = datetime.fromisoformat(moved["starts_at"])
    assert abs(starts - new_start) < timedelta(seconds=1)
    assert datetime.fromisoformat(moved["ends_at"]) - starts == timedelta(hours=3)


def test_only_the_host_can_move_the_start(client, place, host, guest):
    meetup = create(client, host[0], place.id, starts_at=later(days=1)).json()

    assert change_time(client, guest[0], meetup["id"], later(days=2)).status_code == 403


def test_the_start_cannot_move_after_the_meetup_started(client, place, host):
    meetup = create(client, host[0], place.id).json()

    assert change_time(client, host[0], meetup["id"], later(days=1)).status_code == 409


def test_the_new_start_follows_the_same_rules(client, place, host):
    meetup = create(client, host[0], place.id, starts_at=later(days=1)).json()

    assert change_time(client, host[0], meetup["id"], later(minutes=-5)).status_code == 422
    assert change_time(client, host[0], meetup["id"], later(days=31)).status_code == 422


def test_moving_an_unknown_meetup_is_404(client, host):
    assert change_time(client, host[0], 999999999, later(days=1)).status_code == 404


def test_no_later_meetup_at_a_place_suggestion(client, session, place, host):
    # The rule of SCRUM-30 holds for a later Meetup too.
    place.is_suggestion = True
    session.commit()

    assert create(client, host[0], place.id, starts_at=later(days=1)).status_code == 409
