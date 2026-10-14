"""place: Admin approval of Place suggestions (SCRUM-56)

Revision ID: 0015
Revises: 0014
Create Date: 2026-10-14

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "0015"
down_revision: Union[str, Sequence[str], None] = "0014"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("place", sa.Column("suggested_at", sa.DateTime(timezone=True), nullable=True))
    op.add_column("place", sa.Column("confirmed_at", sa.DateTime(timezone=True), nullable=True))
    op.add_column("place", sa.Column("approved_at", sa.DateTime(timezone=True), nullable=True))
    op.add_column("place", sa.Column("osm_hints", sa.ARRAY(sa.String()), nullable=True))
    # Places suggested before this migration: the suggester's Confirmation is the first one.
    # A suggestion whose suggester deleted the account has none; it counts from now.
    op.execute(
        """
        UPDATE place SET suggested_at = coalesce(
            (SELECT min(created_at) FROM place_confirmation WHERE place_id = place.id), now()
        )
        WHERE osm_id IS NULL
        """
    )


def downgrade() -> None:
    op.drop_column("place", "osm_hints")
    op.drop_column("place", "approved_at")
    op.drop_column("place", "confirmed_at")
    op.drop_column("place", "suggested_at")
