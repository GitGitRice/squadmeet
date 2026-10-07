"""Puts one example Place into an empty database.

Only for the walking skeleton. The OpenStreetMap import (SCRUM-21) replaces it.
"""

from sqlmodel import Session, select

from app.db import engine
from app.models import Place

EXAMPLE_PLACE = Place(
    name="Tischtennisplatte Clara-Zetkin-Park (Beispiel)",
    activity_type="table_tennis",
    location="SRID=4326;POINT(12.3561 51.3317)",
)


def main():
    with Session(engine) as session:
        if session.exec(select(Place)).first() is None:
            session.add(EXAMPLE_PLACE)
            session.commit()
            print("Seed: added the example Place")


if __name__ == "__main__":
    main()
