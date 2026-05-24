"""add silo risk level and crop type

Revision ID: c94dbb727f51
Revises: 520d035ccb91
Create Date: 2026-04-06 01:02:27.332033

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'c94dbb727f51'
down_revision: Union[str, None] = '520d035ccb91'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('silos', sa.Column('risk_level', sa.String(length=20), nullable=False, server_default='none'))
    op.add_column('silos', sa.Column('crop_type', sa.String(length=50), nullable=False, server_default='wheat'))


def downgrade() -> None:
    op.drop_column('silos', 'crop_type')
    op.drop_column('silos', 'risk_level')
