"""Test fixtures. The tests need the migrated database (`docker compose up` does that).

Each test runs in one transaction that is rolled back at the end, so no test data stays.
No test calls Cloudflare: the captcha accepts only the token CAPTCHA_OK (except
test_turnstile.py, which checks the real call with Cloudflare's test keys).
"""

import pytest
from fastapi.testclient import TestClient
from sqlmodel import Session

from app.db import engine, get_session
from app.main import app
from app.rate_limit import reset_all
from app.turnstile import turnstile_verifier

CAPTCHA_OK = "ok"


def fake_turnstile(token, ip):
    return token == CAPTCHA_OK


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
    yield TestClient(app)
    app.dependency_overrides.clear()
