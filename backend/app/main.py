import os

from fastapi import APIRouter, Depends, FastAPI, HTTPException, Query, Response
from sqlalchemy import func
from sqlmodel import Session, select

from app.auth import router as auth_router
from app.meetups import router as meetups_router
from app.ratings import router as ratings_router
from app.db import get_session
from app.models import Place, PlaceRead
from app.place_reads import select_place_reads
from app.suggestions import router as suggestions_router

app = FastAPI(title="SquadMeet API")
api = APIRouter(prefix="/api")


@api.get("/health")
def health():
    # APP_VERSION is the commit SHA of the image (backend/Dockerfile). The deploy smoke
    # test waits for it, so an old container that still answers does not pass (SCRUM-23).
    return {"status": "ok", "version": os.environ.get("APP_VERSION", "local")}


# A whole city is about 700 Places; more than this only happens when the map is zoomed far out.
MAX_PLACES = 2000
# Set on the answer when there were more Places than MAX_PLACES, so the map can ask to zoom in.
TRUNCATED_HEADER = "X-Places-Truncated"


def parse_bbox(bbox: str) -> tuple[float, float, float, float]:
    """"west,south,east,north" in degrees (WGS 84), the order of Leaflet's toBBoxString()."""
    try:
        west, south, east, north = (float(value) for value in bbox.split(","))
    except ValueError:
        raise HTTPException(status_code=422, detail="bbox must be west,south,east,north") from None
    if not (-180 <= west < east <= 180 and -90 <= south < north <= 90):
        raise HTTPException(status_code=422, detail="bbox is not a valid area")
    return west, south, east, north


@api.get("/places", response_model=list[PlaceRead])
def list_places(
    response: Response,
    bbox: str = Query(description="The visible map area: west,south,east,north"),
    session: Session = Depends(get_session),
):
    """The Places inside the visible map area (SCRUM-21), at most MAX_PLACES."""
    west, south, east, north = parse_bbox(bbox)
    area = func.ST_MakeEnvelope(west, south, east, north, 4326)
    rows = session.exec(
        select_place_reads()
        # && compares bounding boxes, so PostgreSQL can use the spatial index.
        .where(Place.location.op("&&")(area))
        .order_by(Place.id)
        .limit(MAX_PLACES + 1)
    ).all()
    if len(rows) > MAX_PLACES:
        rows = rows[:MAX_PLACES]
        response.headers[TRUNCATED_HEADER] = "true"
    return [PlaceRead.model_validate(row, from_attributes=True) for row in rows]


# place.id is a PostgreSQL integer; a bigger number in the URL would make the query fail.
MAX_DB_INT = 2_147_483_647


@api.get("/places/{place_id}", response_model=PlaceRead)
def get_place(place_id: int, session: Session = Depends(get_session)):
    """One Place, for the Place detail page (SCRUM-24): its URL can be shared and reloaded."""
    if not 1 <= place_id <= MAX_DB_INT:
        raise HTTPException(status_code=404, detail="Place not found")
    row = session.exec(select_place_reads().where(Place.id == place_id)).first()
    if row is None:
        raise HTTPException(status_code=404, detail="Place not found")
    return PlaceRead.model_validate(row, from_attributes=True)


api.include_router(auth_router)
api.include_router(meetups_router)
api.include_router(suggestions_router)
api.include_router(ratings_router)
app.include_router(api)
