"""Test fixtures. The tests need the migrated database (`docker compose up` does that).

Each test runs in one transaction that is rolled back at the end, so no test data stays.
No test calls Overpass (the OSM hint, SCRUM-56) or Cloudflare: the captcha accepts only the
token CAPTCHA_OK (except test_turnstile.py, which checks the real call with Cloudflare's test
keys).
"""

import pytest
from fastapi.testclient import TestClient
from sqlmodel import Session

from app.db import engine, get_session
from app.geocoding import get_geocoder
from app.main import app
from app.osm_hint import get_osm_hinter
from app.rate_limit import reset_all
from app.turnstile import turnstile_verifier

CAPTCHA_OK = "ok"


def fake_turnstile(token, ip):
    return token == CAPTCHA_OK


class NoHints:
    def hints(self, lat, lon):
        return []


class NoGeocoder:
    def search(self, query, limit=5):
        return []

    def reverse(self, lat, lon):
        return None


@pytest.fixture(autouse=True)
def empty_rate_limits():
    reset_all()


@pytest.fixture
def session():
    connection = engine.connect()
    transaction = connection.begin()
    # A commit or rollback in the app only ends a savepoint, not the outer transaction.
    session = Session(bind=connection, join_transaction_mode="create_savepoint")
    yield session
    session.close()
    transaction.rollback()
    connection.close()


@pytest.fixture
def client(session):
    app.dependency_overrides[get_session] = lambda: session
    app.dependency_overrides[turnstile_verifier] = lambda: fake_turnstile
    app.dependency_overrides[get_geocoder] = lambda: NoGeocoder()
    app.dependency_overrides[get_osm_hinter] = lambda: NoHints()
    yield TestClient(app)
    app.dependency_overrides.clear()
