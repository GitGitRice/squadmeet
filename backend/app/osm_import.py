"""Import the public Places of a city from OpenStreetMap (SCRUM-21).

Two steps, so that a deploy or the demo never depends on a public Overpass server (they are
often too busy to answer):

    python -m app.osm_import fetch Leipzig   # Overpass -> data/osm/leipzig.json; commit the file
    python -m app.osm_import load            # data/osm/*.json -> database, only if it has no Places

`docker compose up` runs `load`. The city is a parameter, so another city is one more `fetch`
(SCRUM-25). OSM data is © OpenStreetMap contributors, ODbL; the map shows the attribution.
"""

import json
import sys
import urllib.parse
import urllib.request
from pathlib import Path

from sqlmodel import Session, select

from app.activities import LABELS, ActivityType
from app.models import Place

DATA_DIR = Path(__file__).resolve().parent.parent / "data" / "osm"

# The main server first; the second one answers when the main one is too busy.
OVERPASS_URLS = (
    "https://overpass-api.de/api/interpreter",
    "https://maps.mail.ru/osm/tools/overpass/api/interpreter",
)

# OSM sport=* values on a leisure=pitch, per Activity type.
SPORTS = {
    "table_tennis": ActivityType.TABLE_TENNIS,
    "basketball": ActivityType.BASKETBALL,
    "soccer": ActivityType.FOOTBALL,
    "beachvolleyball": ActivityType.BEACH_VOLLEYBALL,
    "beach_volleyball": ActivityType.BEACH_VOLLEYBALL,
}

# access=* values of places that are not open to everybody (clubs, schools, customers).
CLOSED_ACCESS = {"private", "customers", "members", "no", "permit", "students"}


def activity_types(tags: dict[str, str]) -> list[ActivityType]:
    """The Activity types of an OSM element. A pitch for two sports gives two Places."""
    if tags.get("leisure") == "fitness_station":
        return [ActivityType.OUTDOOR_FITNESS]
    if tags.get("leisure") != "pitch":
        return []
    found: list[ActivityType] = []
    for sport in tags.get("sport", "").split(";"):
        activity = SPORTS.get(sport.strip())
        if activity and activity not in found:
            found.append(activity)
    return found


def is_public(tags: dict[str, str]) -> bool:
    """A Place is public and free (CONTEXT.md): no closed access, no fee, not indoors."""
    return (
        tags.get("access", "yes") not in CLOSED_ACCESS
        and tags.get("fee", "no") != "yes"
        and tags.get("indoor", "no") != "yes"
    )


def places_from_overpass(elements: list[dict]) -> list[dict]:
    """Turns Overpass elements into Place rows, sorted, so a new fetch gives a small git diff."""
    places = []
    for element in elements:
        tags = element.get("tags", {})
        if not is_public(tags):
            continue
        # A node has its own position; a way or relation has the "center" that `out center` adds.
        point = element if "lat" in element else element.get("center")
        if point is None:
            continue
        for activity in activity_types(tags):
            places.append(
                {
                    "osm_id": f"{element['type']}/{element['id']}",
                    "activity_type": activity.value,
                    "name": tags.get("name") or LABELS[activity],
                    "lat": round(point["lat"], 7),
                    "lon": round(point["lon"], 7),
                }
            )
    return sorted(places, key=lambda p: (p["osm_id"], p["activity_type"]))


def overpass_query(city: str) -> str:
    sports = "|".join(SPORTS)
    # de:regionalschluessel is set only on German municipalities, so "Leipzig" means the city.
    return f"""
[out:json][timeout:180];
area["name"="{city}"]["boundary"="administrative"]["de:regionalschluessel"]->.city;
(
  nwr["leisure"="pitch"]["sport"~"(^|;)({sports})(;|$)"](area.city);
  nwr["leisure"="fitness_station"](area.city);
);
out center tags;
"""


def fetch(city: str) -> Path:
    """Asks Overpass for the Places of a city and writes them to data/osm/<city>.json."""
    body = urllib.parse.urlencode({"data": overpass_query(city)}).encode()
    last_error: Exception | None = None
    for url in OVERPASS_URLS:
        request = urllib.request.Request(url, data=body, headers={"User-Agent": "squadmeet/0.1"})
        try:
            with urllib.request.urlopen(request, timeout=240) as response:
                answer = json.load(response)
            break
        except Exception as error:  # a busy server answers 429/504 or times out
            print(f"{url}: {error}", file=sys.stderr)
            last_error = error
    else:
        raise RuntimeError(f"no Overpass server answered for {city}") from last_error

    places = places_from_overpass(answer["elements"])
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    path = DATA_DIR / f"{city.lower()}.json"
    snapshot = {
        "city": city,
        "source": "© OpenStreetMap contributors, ODbL 1.0, openstreetmap.org/copyright",
        "osm_timestamp": answer.get("osm3s", {}).get("timestamp_osm_base"),
        "places": places,
    }
    path.write_text(json.dumps(snapshot, ensure_ascii=False, indent=1) + "\n")
    print(f"{city}: {len(places)} Places -> {path}")
    return path


def load(session: Session, files: list[Path] | None = None) -> int:
    """Puts the Places from the snapshot files into an empty database. Returns how many.

    A database that already has Places stays as it is; a repeated import without duplicates
    is SCRUM-25.
    """
    if session.exec(select(Place.id).limit(1)).first() is not None:
        return 0
    count = 0
    for path in files if files is not None else sorted(DATA_DIR.glob("*.json")):
        for row in json.loads(path.read_text())["places"]:
            session.add(
                Place(
                    name=row["name"],
                    activity_type=row["activity_type"],
                    osm_id=row["osm_id"],
                    location=f"SRID=4326;POINT({row['lon']} {row['lat']})",
                )
            )
            count += 1
    session.commit()
    return count


def main(args: list[str]) -> None:
    if len(args) == 2 and args[0] == "fetch":
        fetch(args[1])
    elif args == ["load"]:
        from app.db import engine

        with Session(engine) as session:
            print(f"OSM import: loaded {load(session)} Places")
    else:
        sys.exit("usage: python -m app.osm_import fetch <City> | load")


if __name__ == "__main__":
    main(sys.argv[1:])
