"""in-app Notifications for Meetup events (SCRUM-40)

Revision ID: 0017
Revises: 0016
Create Date: 2026-10-15

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "0017"
down_revision: Union[str, Sequence[str], None] = "0016"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "notification",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column(
            "user_id",
            sa.Integer(),
            sa.ForeignKey("app_user.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "meetup_id",
            sa.Integer(),
            sa.ForeignKey("meetup.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("kind", sa.String(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("read_at", sa.DateTime(timezone=True), nullable=True),
        sa.CheckConstraint(
            "kind IN ('meetup_cancelled', 'meetup_ended', 'host_handover', "
            "'blocked_user_joined')",
            name="ck_notification_kind",
        ),
    )
    op.create_index("ix_notification_user_created", "notification", ["user_id", "created_at"])
    op.create_index("ix_notification_meetup_id", "notification", ["meetup_id"])


def downgrade() -> None:
    op.drop_table("notification")
