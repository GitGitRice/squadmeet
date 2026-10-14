"""meetup_series and the Series of a Meetup (weekly Series with Occurrences, SCRUM-38)

Revision ID: 0016
Revises: 0015
Create Date: 2026-10-14

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "0016"
down_revision: Union[str, Sequence[str], None] = "0015"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "meetup_series",
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
        sa.Column("slots", sa.JSON(), nullable=False),
        sa.Column("until", sa.Date(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("cancelled_at", sa.DateTime(timezone=True), nullable=True),
        sa.CheckConstraint("party_size BETWEEN 1 AND 10", name="ck_meetup_series_party_size"),
    )
    op.create_index("ix_meetup_series_place_id", "meetup_series", ["place_id"])
    op.create_index("ix_meetup_series_host_id", "meetup_series", ["host_id"])
    op.add_column(
        "meetup",
        sa.Column(
            "series_id",
            sa.Integer(),
            sa.ForeignKey("meetup_series.id", ondelete="SET NULL"),
            nullable=True,
        ),
    )
    op.add_column("meetup", sa.Column("series_date", sa.Date(), nullable=True))
    op.create_index("ix_meetup_series_id", "meetup", ["series_id"])
    op.create_unique_constraint("uq_meetup_series_date", "meetup", ["series_id", "series_date"])


def downgrade() -> None:
    op.drop_constraint("uq_meetup_series_date", "meetup", type_="unique")
    op.drop_index("ix_meetup_series_id", table_name="meetup")
    op.drop_column("meetup", "series_date")
    op.drop_column("meetup", "series_id")
    op.drop_table("meetup_series")
