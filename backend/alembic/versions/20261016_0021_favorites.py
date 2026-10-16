"""favorites with Time rules and Meetup Notifications (SCRUM-41)

Revision ID: 0021
Revises: 0020
Create Date: 2026-10-16

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = "0021"
down_revision: Union[str, Sequence[str], None] = "0020"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "favorite",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column(
            "place_id",
            sa.Integer(),
            sa.ForeignKey("place.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "user_id",
            sa.Integer(),
            sa.ForeignKey("app_user.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.UniqueConstraint("place_id", "user_id", name="uq_favorite_place_user"),
    )
    op.create_index("ix_favorite_place_id", "favorite", ["place_id"])
    op.create_index("ix_favorite_user_id", "favorite", ["user_id"])
    op.create_table(
        "favorite_time_rule",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column(
            "favorite_id",
            sa.Integer(),
            sa.ForeignKey("favorite.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("weekdays", postgresql.ARRAY(sa.Integer()), nullable=False),
        sa.Column("start_time", sa.Time(), nullable=False),
        sa.Column("end_time", sa.Time(), nullable=False),
        sa.CheckConstraint(
            "cardinality(weekdays) BETWEEN 1 AND 7", name="ck_favorite_rule_weekdays"
        ),
        sa.CheckConstraint("start_time < end_time", name="ck_favorite_rule_same_day"),
    )
    op.create_index(
        "ix_favorite_time_rule_favorite_id", "favorite_time_rule", ["favorite_id"]
    )
    op.drop_constraint("ck_notification_kind", "notification", type_="check")
    op.create_check_constraint(
        "ck_notification_kind",
        "notification",
        "kind IN ('meetup_cancelled', 'meetup_ended', 'host_handover', "
        "'blocked_user_joined', 'favorite_meetup_created')",
    )


def downgrade() -> None:
    op.drop_constraint("ck_notification_kind", "notification", type_="check")
    op.create_check_constraint(
        "ck_notification_kind",
        "notification",
        "kind IN ('meetup_cancelled', 'meetup_ended', 'host_handover', "
        "'blocked_user_joined')",
    )
    op.drop_table("favorite_time_rule")
    op.drop_table("favorite")
