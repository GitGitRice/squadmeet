from typing import Any

from geoalchemy2 import Geometry
from sqlalchemy import Column
from sqlmodel import Field, SQLModel


class Place(SQLModel, table=True):
    """A public, free location for one Activity type (see CONTEXT.md)."""

    id: int | None = Field(default=None, primary_key=True)
    name: str
    activity_type: str
    # WGS 84 (lon/lat), the coordinate system of OpenStreetMap and Leaflet.
    location: Any = Field(sa_column=Column(Geometry("POINT", srid=4326), nullable=False))


class PlaceRead(SQLModel):
    id: int
    name: str
    activity_type: str
    lat: float
    lon: float
