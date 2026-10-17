"""home area for Meetup Notifications nearby (SCRUM-45)

Revision ID: 0024
Revises: 0023
Create Date: 2026-10-16

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from geoalchemy2 import Geometry
from sqlalchemy.dialects import postgresql

revision: str = "0024"
down_revision: Union[str, Sequence[str], None] = "0023"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

OLD_KINDS = (
    "kind IN ('meetup_cancelled', 'meetup_ended', 'host_handover', "
    "'blocked_user_joined', 'favorite_meetup_created', 'contact_meetup_created', "
    "'meetup_invitation')"
)
NEW_KINDS = (
    "kind IN ('meetup_cancelled', 'meetup_ended', 'host_handover', "
    "'blocked_user_joined', 'favorite_meetup_created', 'contact_meetup_created', "
    "'meetup_invitation', 'home_area_meetup_created')"
)


def upgrade() -> None:
    op.create_table(
        "home_area",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column(
            "user_id",
            sa.Integer(),
            sa.ForeignKey("app_user.id", ondelete="CASCADE"),
            nullable=False,
            unique=True,
        ),
        # GeoAlchemy2 adds the spatial index itself.
        sa.Column("location", Geometry("POINT", srid=4326), nullable=False),
        sa.Column("radius_km", sa.Integer(), nullable=False),
        sa.Column("activity_types", postgresql.ARRAY(sa.String()), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.CheckConstraint("radius_km BETWEEN 1 AND 20", name="ck_home_area_radius"),
        sa.CheckConstraint(
            "cardinality(activity_types) >= 1", name="ck_home_area_activity_types"
        ),
    )
    op.drop_constraint("ck_notification_kind", "notification", type_="check")
    op.create_check_constraint("ck_notification_kind", "notification", NEW_KINDS)


def downgrade() -> None:
    op.execute("DELETE FROM notification WHERE kind = 'home_area_meetup_created'")
    op.drop_constraint("ck_notification_kind", "notification", type_="check")
    op.create_check_constraint("ck_notification_kind", "notification", OLD_KINDS)
    op.drop_table("home_area")
