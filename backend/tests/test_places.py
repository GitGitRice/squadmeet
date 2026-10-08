import pytest

from app.models import Place

# Far away in the Atlantic, so imported OSM Places never fall into these areas.
INSIDE = Place(name="Innen", activity_type="basketball", location="SRID=4326;POINT(-30.5 0.5)")
OUTSIDE = Place(name="Außen", activity_type="basketball", location="SRID=4326;POINT(-29.5 0.5)")


def test_places_returns_only_places_inside_the_map_area(client, session):
    session.add_all([INSIDE, OUTSIDE])
    session.commit()

    response = client.get("/api/places", params={"bbox": "-31,0,-30,1"})

    assert response.status_code == 200
    assert [p["name"] for p in response.json()] == ["Innen"]
    assert response.json()[0]["lat"] == pytest.approx(0.5)
    assert response.json()[0]["lon"] == pytest.approx(-30.5)


@pytest.mark.parametrize("bbox", ["1,2,3", "a,b,c,d", "10,0,5,1", "0,0,200,1"])
def test_places_rejects_a_wrong_map_area(client, bbox):
    assert client.get("/api/places", params={"bbox": bbox}).status_code == 422


def test_places_needs_a_map_area(client):
    assert client.get("/api/places").status_code == 422


def test_the_database_rejects_an_unknown_activity_type(session):
    from sqlalchemy.exc import IntegrityError

    session.add(Place(name="Schach", activity_type="chess", location="SRID=4326;POINT(0 0)"))
    with pytest.raises(IntegrityError):
        session.flush()


def test_places_says_when_it_left_places_out(client, session, monkeypatch):
    monkeypatch.setattr("app.main.MAX_PLACES", 1)
    session.add_all(
        [
            Place(name="A", activity_type="football", location="SRID=4326;POINT(-30.5 0.5)"),
            Place(name="B", activity_type="football", location="SRID=4326;POINT(-30.4 0.5)"),
        ]
    )
    session.commit()

    response = client.get("/api/places", params={"bbox": "-31,0,-30,1"})

    assert len(response.json()) == 1
    assert response.headers["X-Places-Truncated"] == "true"


def test_places_has_no_truncated_header_when_all_places_fit(client):
    response = client.get("/api/places", params={"bbox": "-31,0,-30,1"})

    assert "X-Places-Truncated" not in response.headers


def test_the_model_declares_the_activity_type_check():
    names = {c.name for c in Place.__table__.constraints}

    assert "ck_place_activity_type" in names
def test_one_place_by_id(client, session):
    place = Place(name="Korb", activity_type="basketball", location="SRID=4326;POINT(-30.5 0.5)")
    session.add(place)
    session.commit()

    response = client.get(f"/api/places/{place.id}")

    assert response.status_code == 200
    assert response.json()["name"] == "Korb"
    assert response.json()["activity_type"] == "basketball"
    assert response.json()["lat"] == pytest.approx(0.5)


def test_an_unknown_place_is_404(client):
    assert client.get("/api/places/999999999").status_code == 404
