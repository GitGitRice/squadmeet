"""place: OSM id, check of the Activity type, drop the example Place

Revision ID: 0003
Revises: 0002
Create Date: 2026-10-08

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "0003"
down_revision: Union[str, Sequence[str], None] = "0002"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

# A copy of app.activities at this revision: a migration must not change when the app does.
ACTIVITY_TYPES = ("table_tennis", "basketball", "football", "beach_volleyball", "outdoor_fitness")


def upgrade() -> None:
    # The walking skeleton's example Place is not real; the OSM data replaces it (SCRUM-21).
    op.execute("DELETE FROM place WHERE name = 'Tischtennisplatte Clara-Zetkin-Park (Beispiel)'")
    # "node/123" or "way/456". Empty for a Place that a user suggested (SCRUM-30).
    op.add_column("place", sa.Column("osm_id", sa.String(), nullable=True))
    # One OSM pitch with "sport=soccer;basketball" gives two Places, one per Activity type.
    op.create_unique_constraint(
        "uq_place_osm_id_activity_type", "place", ["osm_id", "activity_type"]
    )
    allowed = ", ".join(f"'{t}'" for t in ACTIVITY_TYPES)
    op.create_check_constraint("ck_place_activity_type", "place", f"activity_type IN ({allowed})")


def downgrade() -> None:
    op.drop_constraint("ck_place_activity_type", "place", type_="check")
    op.drop_constraint("uq_place_osm_id_activity_type", "place", type_="unique")
    op.drop_column("place", "osm_id")
