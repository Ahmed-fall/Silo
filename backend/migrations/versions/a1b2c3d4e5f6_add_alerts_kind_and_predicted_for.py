"""add alerts.kind and alerts.predicted_for for predictive alerting

Revision ID: a1b2c3d4e5f6
Revises: 8f1a2c3d4e5f
Create Date: 2026-07-19 00:00:00.000000

Purely additive: kind defaults to 'measured' so every existing alert row and
every existing INSERT statement (sensor ingest, vision uploads) is
unaffected; predicted_for is nullable and only set for kind='predicted' rows
raised by the forecast endpoint.
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'a1b2c3d4e5f6'
down_revision: Union[str, None] = '8f1a2c3d4e5f'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("""
        ALTER TABLE alerts ADD COLUMN kind VARCHAR(20) NOT NULL DEFAULT 'measured'
            CHECK (kind IN ('measured', 'predicted'));
        ALTER TABLE alerts ADD COLUMN predicted_for TIMESTAMPTZ;
        CREATE INDEX idx_alerts_kind ON alerts(kind);
    """)


def downgrade() -> None:
    op.execute("""
        DROP INDEX IF EXISTS idx_alerts_kind;
        ALTER TABLE alerts DROP COLUMN IF EXISTS predicted_for;
        ALTER TABLE alerts DROP COLUMN IF EXISTS kind;
    """)
