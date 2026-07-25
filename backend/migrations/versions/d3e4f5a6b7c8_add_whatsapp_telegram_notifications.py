"""add whatsapp/telegram notification support

Revision ID: d3e4f5a6b7c8
Revises: b7c8d9e0f1a2
Create Date: 2026-07-25 00:00:00.000000

Purely additive, mirrors the device_tokens/FCM push pattern added for the
mobile app:
- users gets telegram_chat_id + per-channel opt-in flags, so a farmer's own
  silo alerts can also reach them on WhatsApp/Telegram alongside FCM push
  (see app/core/notify.py::_notify_silo_owner).
- notification_recipients is a new standalone table for the unauthenticated
  government web dashboard, which has no logged-in user to hang preferences
  off of — duty officers are registered here directly (see
  app/core/notify.py::_notify_ops_recipients).
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'd3e4f5a6b7c8'
down_revision: Union[str, None] = 'b7c8d9e0f1a2'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("""
        ALTER TABLE users ADD COLUMN telegram_chat_id VARCHAR(64);
        ALTER TABLE users ADD COLUMN whatsapp_enabled BOOLEAN NOT NULL DEFAULT FALSE;
        ALTER TABLE users ADD COLUMN telegram_enabled BOOLEAN NOT NULL DEFAULT FALSE;

        CREATE TABLE notification_recipients (
            id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            name              VARCHAR(255) NOT NULL,
            phone_number      VARCHAR(32),
            telegram_chat_id  VARCHAR(64),
            whatsapp_enabled  BOOLEAN NOT NULL DEFAULT FALSE,
            telegram_enabled  BOOLEAN NOT NULL DEFAULT FALSE,
            is_active         BOOLEAN NOT NULL DEFAULT TRUE,
            created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            CONSTRAINT chk_recipient_has_contact
                CHECK (phone_number IS NOT NULL OR telegram_chat_id IS NOT NULL),
            CONSTRAINT chk_recipient_channel_matches_contact
                CHECK (
                    (NOT whatsapp_enabled OR phone_number IS NOT NULL) AND
                    (NOT telegram_enabled OR telegram_chat_id IS NOT NULL)
                )
        );

        CREATE INDEX idx_notification_recipients_active
            ON notification_recipients(is_active) WHERE is_active = TRUE;
    """)


def downgrade() -> None:
    op.execute("""
        DROP TABLE IF EXISTS notification_recipients;
        ALTER TABLE users DROP COLUMN IF EXISTS telegram_enabled;
        ALTER TABLE users DROP COLUMN IF EXISTS whatsapp_enabled;
        ALTER TABLE users DROP COLUMN IF EXISTS telegram_chat_id;
    """)
