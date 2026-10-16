"""audit_log: who changed which row and when (SCRUM-66)

Revision ID: 0019
Revises: 0018
Create Date: 2026-10-16

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = "0019"
down_revision: Union[str, Sequence[str], None] = "0018"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "audit_log",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("occurred_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column(
            "actor_id",
            sa.Integer(),
            sa.ForeignKey("app_user.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column("actor_kind", sa.String(), nullable=False),
        sa.Column("entity", sa.String(), nullable=False),
        sa.Column("entity_id", sa.Integer(), nullable=False),
        sa.Column("action", sa.String(), nullable=False),
        sa.Column("changes", postgresql.JSONB(), nullable=False),
        sa.CheckConstraint(
            "actor_kind IN ('user', 'admin', 'system')", name="ck_audit_log_actor_kind"
        ),
        sa.CheckConstraint("action IN ('insert', 'update', 'delete')", name="ck_audit_log_action"),
    )
    op.create_index("ix_audit_log_entity", "audit_log", ["entity", "entity_id"])
    # Deleting an account sets actor_id to NULL in its rows; the index keeps that fast.
    op.create_index("ix_audit_log_actor_id", "audit_log", ["actor_id"])


def downgrade() -> None:
    op.drop_table("audit_log")
