"""create meetup_join (Join a Meetup with a Party size, SCRUM-34)

Revision ID: 0010
Revises: 0009
Create Date: 2026-10-13

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "0010"
down_revision: Union[str, Sequence[str], None] = "0009"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "meetup_join",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column(
            "meetup_id",
            sa.Integer(),
            sa.ForeignKey("meetup.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "user_id",
            sa.Integer(),
            sa.ForeignKey("app_user.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("party_size", sa.Integer(), nullable=False),
        sa.Column("joined_at", sa.DateTime(timezone=True), nullable=False),
        sa.UniqueConstraint("meetup_id", "user_id", name="uq_meetup_join_meetup_user"),
        sa.CheckConstraint("party_size BETWEEN 1 AND 10", name="ck_meetup_join_party_size"),
    )
    op.create_index("ix_meetup_join_meetup_id", "meetup_join", ["meetup_id"])
    op.create_index("ix_meetup_join_user_id", "meetup_join", ["user_id"])


def downgrade() -> None:
    op.drop_table("meetup_join")
