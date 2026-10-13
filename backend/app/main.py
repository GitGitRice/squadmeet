import os

from fastapi import APIRouter, FastAPI

from app.admin_places import router as admin_places_router
from app.auth import router as auth_router
from app.meetups import router as meetups_router
from app.places import router as places_router
from app.ratings import router as ratings_router
from app.suggestions import router as suggestions_router

app = FastAPI(title="SquadMeet API")
api = APIRouter(prefix="/api")


@api.get("/health")
def health():
    # APP_VERSION is the commit SHA of the image (backend/Dockerfile). The deploy smoke
    # test waits for it, so an old container that still answers does not pass (SCRUM-23).
    return {"status": "ok", "version": os.environ.get("APP_VERSION", "local")}


api.include_router(places_router)
api.include_router(auth_router)
api.include_router(meetups_router)
api.include_router(suggestions_router)
api.include_router(ratings_router)
api.include_router(admin_places_router)
app.include_router(api)
