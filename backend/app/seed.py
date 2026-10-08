"""Puts the OpenStreetMap Places into the database (SCRUM-21, SCRUM-25).

`docker compose up` runs this before the API starts. The Places come from the snapshot files
in data/osm/; see app/osm_import.py.
"""

from sqlmodel import Session

from app.db import engine
from app.osm_import import load


def main():
    with Session(engine) as session:
        print(f"Seed: OSM Places {load(session)}")


if __name__ == "__main__":
    main()
