"""meetup: cancelled, closed, moved to another Meetup; pending move answers (SCRUM-37)

Revision ID: 0012
Revises: 0011
Create Date: 2026-10-13

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "0012"
down_revision: Union[str, Sequence[str], None] = "0011"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("meetup", sa.Column("cancelled_at", sa.DateTime(timezone=True), nullable=True))
    op.add_column("meetup", sa.Column("closed_at", sa.DateTime(timezone=True), nullable=True))
    op.add_column(
        "meetup",
        sa.Column(
            "moved_to_id",
            sa.Integer(),
            sa.ForeignKey("meetup.id", ondelete="SET NULL"),
            nullable=True,
        ),
    )
    op.add_column(
        "meetup",
        sa.Column("host_move_pending", sa.Boolean(), nullable=False, server_default=sa.false()),
    )
    op.add_column(
        "meetup_join",
        sa.Column("move_pending", sa.Boolean(), nullable=False, server_default=sa.false()),
    )


def downgrade() -> None:
    op.drop_column("meetup_join", "move_pending")
    op.drop_column("meetup", "host_move_pending")
    op.drop_column("meetup", "moved_to_id")
    op.drop_column("meetup", "closed_at")
    op.drop_column("meetup", "cancelled_at")
