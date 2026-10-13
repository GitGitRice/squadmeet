"""place: cached nearest address (SCRUM-52)

Revision ID: 0010
Revises: 0009
Create Date: 2026-10-12

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "0010"
down_revision: Union[str, Sequence[str], None] = "0009"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("place", sa.Column("address", sa.String(), nullable=True))


def downgrade() -> None:
    op.drop_column("place", "address")
