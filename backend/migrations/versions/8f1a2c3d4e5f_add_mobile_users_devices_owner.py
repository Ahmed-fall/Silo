"""add users, device_tokens, and silo owner_id for mobile app

Revision ID: 8f1a2c3d4e5f
Revises: c94dbb727f51
Create Date: 2026-07-15 00:00:00.000000

Purely additive: existing /silos, /sensors, /images, /alerts endpoints and
the web frontend are unaffected. silos.owner_id is nullable so existing
(unowned, government-demo) silos keep working exactly as before.
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = '8f1a2c3d4e5f'
down_revision: Union[str, None] = 'c94dbb727f51'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("""
        CREATE TABLE users (
            id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            full_name     VARCHAR(255) NOT NULL,
            phone         VARCHAR(32),
            email         VARCHAR(255),
            password_hash VARCHAR(255) NOT NULL,
            preferred_language VARCHAR(8) NOT NULL DEFAULT 'en',
            created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );

        CREATE UNIQUE INDEX idx_users_email ON users(email) WHERE email IS NOT NULL;
        CREATE UNIQUE INDEX idx_users_phone ON users(phone) WHERE phone IS NOT NULL;

        ALTER TABLE silos ADD COLUMN owner_id UUID REFERENCES users(id) ON DELETE SET NULL;
        CREATE INDEX idx_silos_owner_id ON silos(owner_id);

        CREATE TABLE device_tokens (
            id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            token       VARCHAR(500) NOT NULL,
            platform    VARCHAR(20) NOT NULL CHECK (platform IN ('android', 'ios')),
            created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            UNIQUE (token)
        );

        CREATE INDEX idx_device_tokens_user_id ON device_tokens(user_id);
    """)


def downgrade() -> None:
    op.execute("""
        DROP TABLE IF EXISTS device_tokens;
        ALTER TABLE silos DROP COLUMN IF EXISTS owner_id;
        DROP TABLE IF EXISTS users;
    """)
