from fastapi import APIRouter, Depends, FastAPI
from sqlalchemy import func
from sqlmodel import Session, select

from app.db import get_session
from app.models import Place, PlaceRead

app = FastAPI(title="SquadMeet API")
api = APIRouter(prefix="/api")


@api.get("/health")
def health():
    return {"status": "ok"}


@api.get("/places", response_model=list[PlaceRead])
def list_places(session: Session = Depends(get_session)):
    rows = session.exec(
        select(
            Place.id,
            Place.name,
            Place.activity_type,
            func.ST_Y(Place.location).label("lat"),
            func.ST_X(Place.location).label("lon"),
        )
    ).all()
    return [PlaceRead.model_validate(row, from_attributes=True) for row in rows]


app.include_router(api)
