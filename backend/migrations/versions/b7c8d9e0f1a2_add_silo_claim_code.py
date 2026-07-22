"""add silos.claim_code for the government->farmer silo handover flow

Revision ID: b7c8d9e0f1a2
Revises: a1b2c3d4e5f6
Create Date: 2026-07-19 00:00:00.000000

Government web generates a unique code per silo (POST /silos/{id}/claim-code),
shares it with the farmer, who redeems it in the mobile app
(POST /silos/claim) to attach the silo to their dashboard. Single-use: the
code is cleared on claim. Additive and nullable — nothing existing changes.
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'b7c8d9e0f1a2'
down_revision: Union[str, None] = 'a1b2c3d4e5f6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("ALTER TABLE silos ADD COLUMN claim_code VARCHAR(16) UNIQUE;")


def downgrade() -> None:
    op.execute("ALTER TABLE silos DROP COLUMN IF EXISTS claim_code;")
