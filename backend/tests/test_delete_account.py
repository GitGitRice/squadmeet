"""Delete my account (SCRUM-28): the user and all their personal data go."""

from sqlmodel import func, select

from app.models import LoginSession, Meetup, RecoveryCode, User
from tests.test_auth import PASSWORD, auth_header, register
from tests.test_meetups import create, meetups_at, people_now, place  # noqa: F401 (fixture)
from tests.test_mfa import code_in, login, mfa_user  # noqa: F401 (fixture)


def delete_account(client, token, password=PASSWORD, code=None):
    body = {"password": password}
    if code is not None:
        body["code"] = code
    return client.post("/api/auth/delete-account", json=body, headers=auth_header(token))


def rows_of(session, model, user_id):
    column = model.host_id if model is Meetup else model.user_id
    return session.exec(select(func.count()).select_from(model).where(column == user_id)).one()


def test_delete_removes_the_user_and_all_their_data(client, session, place):  # noqa: F811
    body = register(client)
    token, user_id = body.json()["token"], body.json()["user"]["id"]
    create(client, token, place.id)
    assert login(client).status_code == 200

    response = delete_account(client, token)

    assert response.status_code == 204
    assert session.get(User, user_id) is None
    for model in (LoginSession, RecoveryCode, Meetup):
        assert rows_of(session, model, user_id) == 0


def test_after_delete_the_nickname_can_be_registered_again(client):
    old = register(client).json()
    delete_account(client, old["token"])

    new = register(client, avatar="owl")

    assert new.status_code == 201
    assert new.json()["user"]["id"] != old["user"]["id"]
    assert new.json()["user"]["avatar"] == "owl"
    assert new.json()["user"]["mfa_enabled"] is False


def test_after_delete_the_old_token_and_password_stop_working(client):
    token = register(client).json()["token"]

    delete_account(client, token)

    assert client.get("/api/auth/me", headers=auth_header(token)).status_code == 401
    assert login(client).status_code == 401


def test_hosted_meetup_without_others_leaves_the_map(client, place):  # noqa: F811
    # Join (SCRUM-34) does not exist yet, so nobody else is in the Meetup.
    token = register(client).json()["token"]
    create(client, token, place.id, party_size=3)

    delete_account(client, token)

    assert meetups_at(client, place.id) == []
    assert people_now(client, place.id) == 0


def test_delete_keeps_the_data_of_other_users(client, session, place):  # noqa: F811
    paula = register(client).json()["token"]
    karl = register(client, nickname="Korb_Karl").json()
    create(client, karl["token"], place.id)

    delete_account(client, paula)

    assert session.get(User, karl["user"]["id"]) is not None
    assert len(meetups_at(client, place.id)) == 1
    assert client.get("/api/auth/me", headers=auth_header(karl["token"])).status_code == 200


def test_delete_needs_the_password(client):
    token = register(client).json()["token"]

    response = delete_account(client, token, password="falsch123")

    assert response.status_code == 400
    assert response.json()["detail"] == "Passwort falsch"
    assert client.get("/api/auth/me", headers=auth_header(token)).status_code == 200


def test_delete_needs_a_login(client):
    response = client.post("/api/auth/delete-account", json={"password": PASSWORD})

    assert response.status_code == 401


def test_delete_with_mfa_needs_a_valid_code(client, mfa_user):  # noqa: F811
    token, totp, _ = mfa_user

    missing = delete_account(client, token)
    wrong = delete_account(client, token, code="000000")
    right = delete_account(client, token, code=code_in(totp, 1))

    assert missing.status_code == 400
    assert wrong.status_code == 400
    assert right.status_code == 204


def test_delete_with_mfa_accepts_a_recovery_code(client, mfa_user):  # noqa: F811
    token, _, codes = mfa_user

    assert delete_account(client, token, code=codes[0]).status_code == 204


def test_delete_attempts_are_limited_per_user(client):
    token = register(client).json()["token"]
    for _ in range(5):
        assert delete_account(client, token, password="falsch123").status_code == 400

    response = delete_account(client, token)

    assert response.status_code == 429
    assert client.get("/api/auth/me", headers=auth_header(token)).status_code == 200
