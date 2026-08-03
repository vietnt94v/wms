--liquibase formatted sql

--changeset wms:005-dock-assignments
CREATE TABLE dock_assignments (
    id          VARCHAR(50) PRIMARY KEY,
    user_id     UUID NOT NULL REFERENCES users (id),
    dock_id     VARCHAR(50) NOT NULL REFERENCES docks (id),
    status      VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    started_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    ended_at    TIMESTAMPTZ NULL,
    CONSTRAINT chk_dock_assignments_status CHECK (status IN ('ACTIVE', 'ENDED'))
);

CREATE UNIQUE INDEX uq_dock_assignments_active_dock
    ON dock_assignments (dock_id) WHERE status = 'ACTIVE';

CREATE UNIQUE INDEX uq_dock_assignments_active_user
    ON dock_assignments (user_id) WHERE status = 'ACTIVE';

CREATE INDEX idx_dock_assignments_user ON dock_assignments (user_id);
CREATE INDEX idx_dock_assignments_dock ON dock_assignments (dock_id);
