"""Makes a user an Admin or a normal user again (SCRUM-26). There is no UI for this.

    docker compose exec backend python -m app.admin grant <Nickname>
    docker compose exec backend python -m app.admin revoke <Nickname>

The Admin must also turn on MFA before the Admin functions work (app.auth.require_admin).
"""

import argparse

from sqlalchemy import func
from sqlmodel import Session, select

from app.db import engine
from app.models import User


def set_admin(session: Session, nickname: str, is_admin: bool) -> User | None:
    user = session.exec(select(User).where(func.lower(User.nickname) == nickname.lower())).first()
    if user is not None:
        user.is_admin = is_admin
        session.commit()
    return user


def main():
    parser = argparse.ArgumentParser(prog="python -m app.admin")
    parser.add_argument("action", choices=["grant", "revoke"])
    parser.add_argument("nickname")
    args = parser.parse_args()

    with Session(engine) as session:
        user = set_admin(session, args.nickname, args.action == "grant")
        if user is None:
            raise SystemExit(f"No user with the Nickname {args.nickname!r}")
        mfa = "on" if user.mfa_enabled_at else "off (Admin functions stay blocked until it is on)"
        print(f"{user.nickname}: is_admin={user.is_admin}, MFA {mfa}")


if __name__ == "__main__":
    main()
