"""user: MFA with an authenticator app, Admin flag

Revision ID: 0004
Revises: 0003
Create Date: 2026-10-08

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "0004"
down_revision: Union[str, Sequence[str], None] = "0003"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "app_user",
        sa.Column("is_admin", sa.Boolean(), nullable=False, server_default=sa.false()),
    )
    op.add_column("app_user", sa.Column("mfa_secret", sa.String(), nullable=True))
    op.add_column(
        "app_user", sa.Column("mfa_enabled_at", sa.DateTime(timezone=True), nullable=True)
    )
    op.add_column("app_user", sa.Column("mfa_last_step", sa.BigInteger(), nullable=True))


def downgrade() -> None:
    op.drop_column("app_user", "mfa_last_step")
    op.drop_column("app_user", "mfa_enabled_at")
    op.drop_column("app_user", "mfa_secret")
    op.drop_column("app_user", "is_admin")
