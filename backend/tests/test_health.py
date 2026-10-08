from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_health_answers_ok():
    response = client.get("/api/health")

    assert response.status_code == 200
    assert response.json()["status"] == "ok"


def test_health_names_the_deployed_commit(monkeypatch):
    # The deploy smoke test (SCRUM-23) waits until the new commit answers here.
    monkeypatch.setenv("APP_VERSION", "abc123")

    assert client.get("/api/health").json() == {"status": "ok", "version": "abc123"}


def test_health_version_is_local_without_a_build(monkeypatch):
    monkeypatch.delenv("APP_VERSION", raising=False)

    assert client.get("/api/health").json()["version"] == "local"
