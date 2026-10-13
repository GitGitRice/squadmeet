"""contact_request and user_block (Contacts and Block, SCRUM-32)

Revision ID: 0014
Revises: 0013
Create Date: 2026-10-13

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "0014"
down_revision: Union[str, Sequence[str], None] = "0013"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def user_column(name: str) -> sa.Column:
    return sa.Column(
        name, sa.Integer(), sa.ForeignKey("app_user.id", ondelete="CASCADE"), nullable=False
    )


def upgrade() -> None:
    op.create_table(
        "contact_request",
        sa.Column("id", sa.Integer(), primary_key=True),
        user_column("requester_id"),
        user_column("addressee_id"),
        sa.Column("status", sa.String(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.UniqueConstraint("requester_id", "addressee_id", name="uq_contact_request_pair"),
        sa.CheckConstraint("requester_id <> addressee_id", name="ck_contact_request_not_self"),
        sa.CheckConstraint(
            "status IN ('pending', 'accepted', 'declined')", name="ck_contact_request_status"
        ),
    )
    op.create_index("ix_contact_request_requester_id", "contact_request", ["requester_id"])
    op.create_index("ix_contact_request_addressee_id", "contact_request", ["addressee_id"])
    op.create_table(
        "user_block",
        sa.Column("id", sa.Integer(), primary_key=True),
        user_column("blocker_id"),
        user_column("blocked_id"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.UniqueConstraint("blocker_id", "blocked_id", name="uq_user_block_pair"),
        sa.CheckConstraint("blocker_id <> blocked_id", name="ck_user_block_not_self"),
    )
    op.create_index("ix_user_block_blocker_id", "user_block", ["blocker_id"])
    op.create_index("ix_user_block_blocked_id", "user_block", ["blocked_id"])


def downgrade() -> None:
    op.drop_table("user_block")
    op.drop_table("contact_request")
