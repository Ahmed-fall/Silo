"""create initial tables

Revision ID: 520d035ccb91
Revises: 
Create Date: 2026-03-17 23:22:53.196654

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '520d035ccb91'
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute("""
        CREATE EXTENSION IF NOT EXISTS "pgcrypto";

        CREATE TABLE silos (
            id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            name        VARCHAR(255) NOT NULL,
            location    VARCHAR(255),
            capacity_kg NUMERIC(12, 2),
            created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );

        CREATE TABLE sensor_readings (
            id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            silo_id      UUID NOT NULL REFERENCES silos(id) ON DELETE CASCADE,
            temperature  NUMERIC(5, 2),
            humidity     NUMERIC(5, 2),
            soil_moisture NUMERIC(5, 2),
            ndvi         NUMERIC(5, 4),
            recorded_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );

        CREATE TABLE images (
            id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            silo_id      UUID NOT NULL REFERENCES silos(id) ON DELETE CASCADE,
            file_path    VARCHAR(500) NOT NULL,
            detected_label   VARCHAR(100),
            confidence   NUMERIC(5, 4),
            uploaded_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );

        CREATE TABLE alerts (
            id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            silo_id      UUID NOT NULL REFERENCES silos(id) ON DELETE CASCADE,
            risk_level   VARCHAR(20) NOT NULL CHECK (risk_level IN ('low', 'medium', 'high')),
            risk_score   NUMERIC(5, 2),
            message      TEXT,
            triggered_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            is_read      BOOLEAN NOT NULL DEFAULT FALSE
        );

        CREATE INDEX idx_sensor_silo_id ON sensor_readings(silo_id);
        CREATE INDEX idx_sensor_recorded_at ON sensor_readings(recorded_at DESC);
        CREATE INDEX idx_alerts_silo_id ON alerts(silo_id);
        CREATE INDEX idx_alerts_unread ON alerts(is_read) WHERE is_read = FALSE;
    """)


def downgrade() -> None:
    op.execute("""
        DROP TABLE IF EXISTS alerts;
        DROP TABLE IF EXISTS images;
        DROP TABLE IF EXISTS sensor_readings;
        DROP TABLE IF EXISTS silos;
    """)