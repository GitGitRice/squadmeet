"""create place

Revision ID: 0001
Revises:
Create Date: 2026-10-07

"""
from typing import Sequence, Union

from alembic import op
import geoalchemy2
import sqlalchemy as sa

revision: str = "0001"
down_revision: Union[str, Sequence[str], None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("CREATE EXTENSION IF NOT EXISTS postgis")
    op.create_table(
        "place",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("name", sa.String(), nullable=False),
        sa.Column("activity_type", sa.String(), nullable=False),
        sa.Column(
            "location",
            geoalchemy2.Geometry(geometry_type="POINT", srid=4326),
            nullable=False,
        ),
    )
    # geoalchemy2 creates the spatial index (idx_place_location) with the table.


def downgrade() -> None:
    op.drop_table("place")
