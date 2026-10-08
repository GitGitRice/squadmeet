"""Test fixtures. The tests need the migrated database (`docker compose up` does that).

Each test runs in one transaction that is rolled back at the end, so no test data stays.
"""

import pytest
from fastapi.testclient import TestClient
from sqlmodel import Session

from app.db import engine, get_session
from app.main import app


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
    yield TestClient(app)
    app.dependency_overrides.clear()
