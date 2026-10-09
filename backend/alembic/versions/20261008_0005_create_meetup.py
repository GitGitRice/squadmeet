"""create meetup (Now-meetup, SCRUM-29)

Revision ID: 0005
Revises: 0004
Create Date: 2026-10-08

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "0005"
down_revision: Union[str, Sequence[str], None] = "0004"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "meetup",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column(
            "place_id", sa.Integer(), sa.ForeignKey("place.id", ondelete="CASCADE"), nullable=False
        ),
        sa.Column(
            "host_id",
            sa.Integer(),
            sa.ForeignKey("app_user.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("party_size", sa.Integer(), nullable=False),
        sa.Column("starts_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("ends_at", sa.DateTime(timezone=True), nullable=False),
        sa.CheckConstraint("party_size BETWEEN 1 AND 10", name="ck_meetup_party_size"),
        sa.CheckConstraint("ends_at > starts_at", name="ck_meetup_ends_after_start"),
    )
    op.create_index("ix_meetup_place_id", "meetup", ["place_id"])
    op.create_index("ix_meetup_host_id", "meetup", ["host_id"])


def downgrade() -> None:
    op.drop_table("meetup")
