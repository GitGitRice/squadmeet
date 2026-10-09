"""create rating (stars and Reasons, SCRUM-31)

Revision ID: 0007
Revises: 0006
Create Date: 2026-10-09

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "0007"
down_revision: Union[str, Sequence[str], None] = "0006"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "rating",
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
        sa.Column("stars", sa.Integer(), nullable=False),
        sa.Column("reasons", sa.ARRAY(sa.String()), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.UniqueConstraint("place_id", "user_id", name="uq_rating_place_user"),
        sa.CheckConstraint("stars BETWEEN 1 AND 5", name="ck_rating_stars"),
        sa.CheckConstraint("cardinality(reasons) >= 1", name="ck_rating_has_reason"),
    )
    op.create_index("ix_rating_user_id", "rating", ["user_id"])


def downgrade() -> None:
    op.drop_table("rating")
