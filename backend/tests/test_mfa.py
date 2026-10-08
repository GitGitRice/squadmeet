import time

import pyotp
import pytest
from fastapi import HTTPException
from sqlmodel import select

from app.admin import set_admin
from app.auth import MFA_REQUIRED, require_admin
from app.models import RecoveryCode, User
from tests.test_auth import PASSWORD, auth_header, register


def setup_mfa(client, token):
    response = client.post("/api/auth/mfa/setup", headers=auth_header(token))
    assert response.status_code == 200
    return pyotp.TOTP(response.json()["secret"])


def code_in(totp, steps):
    """The code of the time step `steps` away from now (negative = the past)."""
    return totp.at(time.time() + steps * totp.interval)


@pytest.fixture
def mfa_user(client):
    """A registered user with MFA on: (token, totp, recovery codes)."""
    body = register(client).json()
    totp = setup_mfa(client, body["token"])
    response = client.post(
        "/api/auth/mfa/enable",
        json={"code": code_in(totp, 0)},
        headers=auth_header(body["token"]),
    )
    assert response.status_code == 200
    assert response.json()["mfa_enabled"] is True
    return body["token"], totp, body["recovery_codes"]


def login(client, code=None):
    body = {"nickname": "Pingpong_Paula", "password": PASSWORD}
    if code is not None:
        body["code"] = code
    return client.post("/api/auth/login", json=body)


def test_setup_returns_secret_uri_and_qr_code(client):
    token = register(client).json()["token"]

    body = client.post("/api/auth/mfa/setup", headers=auth_header(token)).json()

    assert body["otpauth_uri"].startswith("otpauth://totp/Squadmeet:Pingpong_Paula?")
    assert f"secret={body['secret']}" in body["otpauth_uri"]
    assert body["qr_code"].startswith("data:image/svg+xml")


def test_mfa_is_off_until_a_code_confirms_it(client):
    token = register(client).json()["token"]
    setup_mfa(client, token)

    assert client.get("/api/auth/me", headers=auth_header(token)).json()["mfa_enabled"] is False
    assert login(client).status_code == 200


def test_enable_rejects_a_wrong_code(client):
    token = register(client).json()["token"]
    totp = setup_mfa(client, token)
    wrong = f"{(int(code_in(totp, 0)) + 1) % 1_000_000:06d}"

    response = client.post("/api/auth/mfa/enable", json={"code": wrong}, headers=auth_header(token))

    assert response.status_code == 400


def test_enable_rejects_a_recovery_code(client):
    body = register(client).json()
    setup_mfa(client, body["token"])

    response = client.post(
        "/api/auth/mfa/enable",
        json={"code": body["recovery_codes"][0]},
        headers=auth_header(body["token"]),
    )

    assert response.status_code == 400


def test_login_with_mfa_asks_for_the_code(client, mfa_user):
    response = login(client)

    assert response.status_code == 401
    assert response.json()["detail"] == MFA_REQUIRED


def test_login_with_mfa_and_a_current_code(client, mfa_user):
    _, totp, _ = mfa_user

    # The enable step used the current code; the next one is still in the valid window.
    response = login(client, code_in(totp, 1))

    assert response.status_code == 200
    assert response.json()["user"]["mfa_enabled"] is True


def test_login_rejects_a_wrong_code(client, mfa_user):
    _, totp, _ = mfa_user
    wrong = f"{(int(code_in(totp, 1)) + 1) % 1_000_000:06d}"

    response = login(client, wrong)

    assert response.status_code == 401
    assert response.json()["detail"] == "Code falsch"


def test_login_rejects_an_old_code(client, mfa_user):
    _, totp, _ = mfa_user

    assert login(client, code_in(totp, -3)).status_code == 401


def test_a_code_works_only_once(client, mfa_user):
    _, totp, _ = mfa_user
    code = code_in(totp, 1)

    assert login(client, code).status_code == 200
    assert login(client, code).status_code == 401


def test_recovery_code_works_once_for_login(client, session, mfa_user):
    _, _, codes = mfa_user
    # Typed by hand: lower case, spaces instead of dashes.
    typed = codes[0].lower().replace("-", " ")

    assert login(client, typed).status_code == 200
    assert login(client, codes[0]).status_code == 401
    used = session.exec(select(RecoveryCode).where(RecoveryCode.used_at.is_not(None))).all()
    assert len(used) == 1


def test_disable_needs_a_valid_code(client, mfa_user):
    token, totp, _ = mfa_user

    wrong = client.post("/api/auth/mfa/disable", json={"code": "000000"}, headers=auth_header(token))
    right = client.post(
        "/api/auth/mfa/disable", json={"code": code_in(totp, 1)}, headers=auth_header(token)
    )

    assert wrong.status_code == 400
    assert right.status_code == 200
    assert right.json()["mfa_enabled"] is False
    assert login(client).status_code == 200


def test_setup_is_refused_while_mfa_is_on(client, mfa_user):
    token, _, _ = mfa_user

    assert client.post("/api/auth/mfa/setup", headers=auth_header(token)).status_code == 409


def test_admin_without_mfa_is_blocked(client, session):
    register(client)
    user = set_admin(session, "pingpong_paula", True)

    with pytest.raises(HTTPException) as blocked:
        require_admin(user)

    assert blocked.value.status_code == 403
    assert "Zwei-Faktor" in blocked.value.detail


def test_admin_with_mfa_is_allowed(client, session, mfa_user):
    user = set_admin(session, "Pingpong_Paula", True)

    assert require_admin(user) is user
    me = client.get("/api/auth/me", headers=auth_header(mfa_user[0])).json()
    assert me["is_admin"] is True


def test_normal_user_is_not_an_admin(client, session, mfa_user):
    user = session.exec(select(User)).one()

    with pytest.raises(HTTPException) as blocked:
        require_admin(user)

    assert blocked.value.status_code == 403
    assert blocked.value.detail == "Nur für Admins"
