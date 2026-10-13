"""place: locked and deleted by an Admin (SCRUM-39)

Revision ID: 0013
Revises: 0012
Create Date: 2026-10-13

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "0013"
down_revision: Union[str, Sequence[str], None] = "0012"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("place", sa.Column("locked_at", sa.DateTime(timezone=True), nullable=True))
    op.add_column("place", sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True))


def downgrade() -> None:
    op.drop_column("place", "deleted_at")
    op.drop_column("place", "locked_at")
