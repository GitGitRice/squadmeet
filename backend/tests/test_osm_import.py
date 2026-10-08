import json

import pytest
from sqlmodel import select

from app.activities import ActivityType
from app.models import Place
from app.osm_import import (
    activity_types,
    check_answer,
    check_city,
    is_public,
    load,
    places_from_overpass,
    snapshot_name,
)


@pytest.mark.parametrize(
    ("tags", "expected"),
    [
        ({"leisure": "pitch", "sport": "table_tennis"}, [ActivityType.TABLE_TENNIS]),
        ({"leisure": "pitch", "sport": "basketball"}, [ActivityType.BASKETBALL]),
        ({"leisure": "pitch", "sport": "soccer"}, [ActivityType.FOOTBALL]),
        ({"leisure": "pitch", "sport": "beachvolleyball"}, [ActivityType.BEACH_VOLLEYBALL]),
        ({"leisure": "fitness_station"}, [ActivityType.OUTDOOR_FITNESS]),
        # One pitch for two sports gives two Places.
        (
            {"leisure": "pitch", "sport": "soccer;basketball"},
            [ActivityType.FOOTBALL, ActivityType.BASKETBALL],
        ),
        ({"leisure": "pitch", "sport": "tennis"}, []),
        ({"leisure": "park", "sport": "soccer"}, []),
        ({"leisure": "pitch"}, []),
    ],
)
def test_osm_tags_map_to_activity_types(tags, expected):
    assert activity_types(tags) == expected


@pytest.mark.parametrize(
    "tags",
    [
        {"access": "private"},
        {"access": "customers"},
        {"access": "members"},
        {"fee": "yes"},
        {"indoor": "yes"},
    ],
)
def test_private_paid_and_indoor_places_are_skipped(tags):
    assert not is_public(tags)


def test_places_without_access_tags_are_public():
    assert is_public({"leisure": "pitch", "sport": "soccer"})


def test_places_from_overpass_uses_node_position_and_way_center():
    elements = [
        {
            "type": "way",
            "id": 2,
            "center": {"lat": 51.2, "lon": 12.2},
            "tags": {"leisure": "pitch", "sport": "basketball", "name": "Korbanlage"},
        },
        {"type": "node", "id": 1, "lat": 51.1, "lon": 12.1, "tags": {"leisure": "fitness_station"}},
        {
            "type": "node",
            "id": 3,
            "lat": 51.3,
            "lon": 12.3,
            "tags": {"leisure": "pitch", "sport": "soccer", "access": "private"},
        },
    ]

    assert places_from_overpass(elements) == [
        {
            "osm_id": "node/1",
            "activity_type": "outdoor_fitness",
            "name": "Outdoor-Fitness",
            "lat": 51.1,
            "lon": 12.1,
        },
        {
            "osm_id": "way/2",
            "activity_type": "basketball",
            "name": "Korbanlage",
            "lat": 51.2,
            "lon": 12.2,
        },
    ]


def test_the_leipzig_snapshot_has_places_for_every_activity_type():
    from app.osm_import import DATA_DIR

    places = json.loads((DATA_DIR / "leipzig.json").read_text())["places"]

    assert {p["activity_type"] for p in places} == {a.value for a in ActivityType}


def test_load_fills_an_empty_database_only(session, tmp_path):
    snapshot = tmp_path / "test.json"
    row = {"osm_id": "node/1", "activity_type": "basketball", "name": "Korb", "lat": 1, "lon": 2}
    snapshot.write_text(json.dumps({"places": [row]}))
    session.exec(Place.__table__.delete())

    assert load(session, [snapshot]) == 1
    assert load(session, [snapshot]) == 0
    assert len(session.exec(select(Place)).all()) == 1


AREA = {"type": "area", "id": 3600062649}


def test_an_incomplete_overpass_answer_is_rejected():
    answer = {"remark": "runtime error: Query timed out", "elements": [AREA]}

    with pytest.raises(RuntimeError, match="incomplete"):
        check_answer("Leipzig", answer)


@pytest.mark.parametrize("areas", [[], [AREA, {"type": "area", "id": 1}]])
def test_a_city_name_must_match_exactly_one_municipality(areas):
    with pytest.raises(RuntimeError, match="municipalities"):
        check_answer("Neustadt", {"elements": areas})


def test_a_complete_answer_for_one_municipality_passes():
    check_answer("Leipzig", {"elements": [AREA]})


@pytest.mark.parametrize("city", ['Leip"zig', "Leipzig;", "", "../x"])
def test_city_names_that_could_break_the_query_are_rejected(city):
    with pytest.raises(ValueError):
        check_city(city)


@pytest.mark.parametrize(
    ("city", "file"),
    [("Leipzig", "leipzig"), ("Halle (Saale)", "halle-saale"), ("Lübben", "luebben")],
)
def test_snapshot_file_names_are_plain(city, file):
    check_city(city)
    assert snapshot_name(city) == file


def test_load_warns_about_snapshot_places_that_an_old_database_lacks(session, tmp_path, capsys):
    first = {"osm_id": "node/1", "activity_type": "basketball", "name": "A", "lat": 1, "lon": 2}
    second = {"osm_id": "node/2", "activity_type": "football", "name": "B", "lat": 1, "lon": 2}
    snapshot = tmp_path / "test.json"
    session.exec(Place.__table__.delete())
    snapshot.write_text(json.dumps({"places": [first]}))
    load(session, [snapshot])

    snapshot.write_text(json.dumps({"places": [first, second]}))

    assert load(session, [snapshot]) == 0
    assert "1 Places from data/osm are not in the database" in capsys.readouterr().err
