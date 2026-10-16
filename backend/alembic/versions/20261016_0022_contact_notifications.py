"""notification: Contact Notifications and invitations with the sender (SCRUM-43)

Revision ID: 0022
Revises: 0021
Create Date: 2026-10-16

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "0022"
down_revision: Union[str, Sequence[str], None] = "0021"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

OLD_KINDS = (
    "kind IN ('meetup_cancelled', 'meetup_ended', 'host_handover', "
    "'blocked_user_joined', 'favorite_meetup_created')"
)
NEW_KINDS = (
    "kind IN ('meetup_cancelled', 'meetup_ended', 'host_handover', "
    "'blocked_user_joined', 'favorite_meetup_created', 'contact_meetup_created', "
    "'meetup_invitation')"
)


def upgrade() -> None:
    # Who caused the Notification (the Contact or the inviter); empty after an account delete.
    op.add_column(
        "notification",
        sa.Column(
            "actor_id",
            sa.Integer(),
            sa.ForeignKey("app_user.id", ondelete="SET NULL"),
            nullable=True,
        ),
    )
    op.drop_constraint("ck_notification_kind", "notification", type_="check")
    op.create_check_constraint("ck_notification_kind", "notification", NEW_KINDS)


def downgrade() -> None:
    op.execute(
        "DELETE FROM notification WHERE kind IN ('contact_meetup_created', 'meetup_invitation')"
    )
    op.drop_constraint("ck_notification_kind", "notification", type_="check")
    op.create_check_constraint("ck_notification_kind", "notification", OLD_KINDS)
    op.drop_column("notification", "actor_id")
