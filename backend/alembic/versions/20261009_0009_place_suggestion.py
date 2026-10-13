"""place suggestion and confirmation (SCRUM-30)

Revision ID: 0009
Revises: 0008
Create Date: 2026-10-09

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "0009"
down_revision: Union[str, Sequence[str], None] = "0008"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # True while a user-suggested Place has fewer than 3 Confirmations. OSM Places are false.
    op.add_column(
        "place",
        sa.Column("is_suggestion", sa.Boolean(), nullable=False, server_default=sa.false()),
    )
    op.create_table(
        "place_confirmation",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column(
            "place_id", sa.Integer(), sa.ForeignKey("place.id", ondelete="CASCADE"), nullable=False
        ),
        sa.Column(
            "user_id",
            sa.Integer(),
            sa.ForeignKey("app_user.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.UniqueConstraint("place_id", "user_id", name="uq_place_confirmation_place_user"),
    )
    op.create_index("ix_place_confirmation_user_id", "place_confirmation", ["user_id"])


def downgrade() -> None:
    op.drop_table("place_confirmation")
    op.drop_column("place", "is_suggestion")
