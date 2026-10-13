"""Admin: lock, unlock and delete a Place (SCRUM-39)."""

import json
from datetime import UTC, datetime, timedelta

import pytest
from sqlmodel import select

from app.admin import set_admin
from app.models import Meetup, Place
from app.osm_import import load
from tests.test_auth import auth_header, register
from tests.test_meetups import create, host, place  # noqa: F401 (fixtures)

BBOX = {"bbox": "-31,0,-30,1"}


@pytest.fixture
def admin(client, session):
    """The token of an Admin with MFA on (require_admin needs both)."""
    body = register(client, nickname="Admin_Anna").json()
    user = set_admin(session, "Admin_Anna", True)
    user.mfa_enabled_at = datetime.now(UTC)
    session.commit()
    return body["token"]


def lock(client, token, place_id):
    return client.post(f"/api/admin/places/{place_id}/lock", headers=auth_header(token))


def unlock(client, token, place_id):
    return client.post(f"/api/admin/places/{place_id}/unlock", headers=auth_header(token))


def delete(client, token, place_id):
    return client.delete(f"/api/admin/places/{place_id}", headers=auth_header(token))


def on_map(client, place_id):
    return any(p["id"] == place_id for p in client.get("/api/places", params=BBOX).json())


def later(client, token, place_id, hours_ahead=3):
    starts_at = (datetime.now(UTC) + timedelta(hours=hours_ahead)).isoformat()
    return create(client, token, place_id, starts_at=starts_at).json()


def test_a_normal_user_cannot_lock_unlock_or_delete(client, place, host):
    token = host[0]

    assert lock(client, token, place.id).status_code == 403
    assert unlock(client, token, place.id).status_code == 403
    assert delete(client, token, place.id).status_code == 403
    assert on_map(client, place.id)


def test_an_admin_without_mfa_cannot_lock(client, session, place):
    token = register(client, nickname="Admin_Anna").json()["token"]
    set_admin(session, "Admin_Anna", True)

    assert lock(client, token, place.id).status_code == 403


def test_a_guest_cannot_lock(client, place):
    assert client.post(f"/api/admin/places/{place.id}/lock").status_code == 401


def test_lock_hides_the_place_from_map_detail_and_search(client, place, admin):
    assert lock(client, admin, place.id).status_code == 200

    assert not on_map(client, place.id)
    assert client.get(f"/api/places/{place.id}").status_code == 404
    assert client.get("/api/search", params={"q": "Testplatte"}).json() == []
    assert client.get(f"/api/places/{place.id}/meetups").status_code == 404
    assert client.get(f"/api/places/{place.id}/ratings").status_code == 404


def test_no_new_meetups_at_a_locked_place(client, place, host, admin):
    lock(client, admin, place.id)

    assert create(client, host[0], place.id).status_code == 404
    assert later(client, host[0], place.id) == {"detail": "Place not found"}


def test_lock_cancels_later_meetups_and_ends_running_ones(client, session, place, host, admin):
    running = create(client, host[0], place.id).json()
    upcoming = later(client, host[0], place.id)
    ended = Meetup(
        place_id=place.id,
        host_id=host[1],
        party_size=1,
        starts_at=datetime.now(UTC) - timedelta(hours=3),
        ends_at=datetime.now(UTC) - timedelta(hours=1),
    )
    session.add(ended)
    session.commit()
    ended_at = ended.ends_at

    lock(client, admin, place.id)

    session.expire_all()
    assert session.get(Meetup, upcoming["id"]).cancelled_at is not None
    running_now = session.get(Meetup, running["id"])
    assert running_now.cancelled_at is None
    assert running_now.ends_at <= datetime.now(UTC)
    # A Meetup that was already over keeps its history.
    past = session.get(Meetup, ended.id)
    assert past.cancelled_at is None and past.ends_at == ended_at


def test_unlock_shows_the_place_again_but_cancelled_meetups_stay_cancelled(
    client, session, place, host, admin
):
    upcoming = later(client, host[0], place.id)
    lock(client, admin, place.id)

    response = unlock(client, admin, place.id)

    assert response.status_code == 204
    assert on_map(client, place.id)
    assert client.get(f"/api/places/{place.id}").status_code == 200
    meetups = client.get(f"/api/places/{place.id}/meetups").json()
    assert [m["cancelled"] for m in meetups if m["id"] == upcoming["id"]] == [True]


def test_lock_twice_and_unlock_an_open_place_are_conflicts(client, place, admin):
    assert unlock(client, admin, place.id).status_code == 409
    lock(client, admin, place.id)
    assert lock(client, admin, place.id).status_code == 409


def test_the_admin_lists_the_locked_places(client, place, admin):
    assert client.get("/api/admin/places/locked", headers=auth_header(admin)).json() == []
    lock(client, admin, place.id)

    locked = client.get("/api/admin/places/locked", headers=auth_header(admin)).json()

    assert [p["id"] for p in locked] == [place.id]
    assert locked[0]["name"] == "Testplatte"
    assert locked[0]["locked_at"]


def test_delete_hides_the_place_and_cancels_later_meetups(client, session, place, host, admin):
    upcoming = later(client, host[0], place.id)

    assert delete(client, admin, place.id).status_code == 204

    assert not on_map(client, place.id)
    assert client.get(f"/api/places/{place.id}").status_code == 404
    session.expire_all()
    assert session.get(Meetup, upcoming["id"]).cancelled_at is not None


def test_a_deleted_place_cannot_be_unlocked_or_deleted_again(client, place, admin):
    lock(client, admin, place.id)
    delete(client, admin, place.id)

    assert unlock(client, admin, place.id).status_code == 404
    assert lock(client, admin, place.id).status_code == 404
    assert delete(client, admin, place.id).status_code == 404
    assert client.get("/api/admin/places/locked", headers=auth_header(admin)).json() == []


def test_an_unknown_place_is_404(client, admin):
    assert lock(client, admin, 2_000_000_000).status_code == 404


def test_an_import_run_does_not_bring_a_deleted_place_back(client, session, admin, tmp_path):
    snapshot = tmp_path / "testcity.json"
    snapshot.write_text(
        json.dumps(
            {
                "places": [
                    {
                        "osm_id": "node/999000111",
                        "activity_type": "table_tennis",
                        "name": "Alte Platte",
                        "lat": 0.5,
                        "lon": -30.5,
                    }
                ]
            }
        )
    )
    load(session, [snapshot])
    place = session.exec(select(Place).where(Place.osm_id == "node/999000111")).one()
    delete(client, admin, place.id)

    load(session, [snapshot])

    places = session.exec(select(Place).where(Place.osm_id == "node/999000111")).all()
    assert len(places) == 1
    assert not on_map(client, place.id)
    assert client.get(f"/api/places/{place.id}").status_code == 404


def test_an_import_run_does_not_unlock_a_locked_place(client, session, admin, tmp_path):
    snapshot = tmp_path / "testcity.json"
    snapshot.write_text(
        json.dumps(
            {
                "places": [
                    {
                        "osm_id": "node/999000222",
                        "activity_type": "table_tennis",
                        "name": "Zweite Platte",
                        "lat": 0.5,
                        "lon": -30.5,
                    }
                ]
            }
        )
    )
    load(session, [snapshot])
    place = session.exec(select(Place).where(Place.osm_id == "node/999000222")).one()
    lock(client, admin, place.id)

    load(session, [snapshot])

    assert not on_map(client, place.id)
