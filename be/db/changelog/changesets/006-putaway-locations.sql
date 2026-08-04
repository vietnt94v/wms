--liquibase formatted sql

--changeset wms:006-putaway-locations
CREATE TABLE locations (
    code            VARCHAR(20) PRIMARY KEY,
    warehouse_id    VARCHAR(50) NOT NULL DEFAULT 'WH-01',
    zone            VARCHAR(20) NOT NULL,
    row_label       VARCHAR(5) NOT NULL,
    col_num         INTEGER NOT NULL,
    status          VARCHAR(20) NOT NULL DEFAULT 'AVAILABLE',
    CONSTRAINT chk_location_zone CHECK (zone IN ('STORAGE', 'QUARANTINE')),
    CONSTRAINT chk_location_status CHECK (status IN ('AVAILABLE', 'OCCUPIED'))
);

INSERT INTO locations (code, warehouse_id, zone, row_label, col_num, status)
SELECT
    row_label || col_num::text,
    'WH-01',
    'STORAGE',
    row_label,
    col_num,
    'AVAILABLE'
FROM (
    SELECT chr(64 + r) AS row_label
    FROM generate_series(1, 10) AS r
) rows
CROSS JOIN generate_series(1, 10) AS col_num;

INSERT INTO locations (code, warehouse_id, zone, row_label, col_num, status)
SELECT
    'Q' || col_num::text,
    'WH-01',
    'QUARANTINE',
    'Q',
    col_num,
    'AVAILABLE'
FROM generate_series(1, 10) AS col_num;

CREATE TABLE location_inventory (
    location_code   VARCHAR(20) NOT NULL REFERENCES locations (code),
    sku             VARCHAR(100) NOT NULL REFERENCES products (sku),
    qty             INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (location_code, sku),
    CONSTRAINT chk_location_inventory_qty CHECK (qty >= 0)
);

CREATE TABLE putaway_task_lines (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id         VARCHAR(50) NOT NULL,
    sku             VARCHAR(100) NOT NULL REFERENCES products (sku),
    qty             INTEGER NOT NULL,
    confirmed_qty   INTEGER NULL,
    CONSTRAINT chk_putaway_line_qty CHECK (qty > 0)
);

ALTER TABLE putaway_tasks
    ADD COLUMN handling_unit_type VARCHAR(20),
    ADD COLUMN handling_unit_code VARCHAR(255),
    ADD COLUMN assigned_location VARCHAR(20),
    ADD COLUMN confirmed_at TIMESTAMPTZ;

INSERT INTO putaway_task_lines (task_id, sku, qty)
SELECT id, sku, qty FROM putaway_tasks WHERE sku IS NOT NULL;

UPDATE putaway_tasks
SET handling_unit_type = 'CONTAINER',
    handling_unit_code = COALESCE(sscc, id)
WHERE handling_unit_type IS NULL;

ALTER TABLE putaway_tasks
    ALTER COLUMN handling_unit_type SET NOT NULL,
    ALTER COLUMN handling_unit_code SET NOT NULL;

ALTER TABLE putaway_tasks
    DROP COLUMN sku,
    DROP COLUMN qty,
    DROP COLUMN suggested_location,
    DROP COLUMN sscc;

ALTER TABLE putaway_tasks
    ADD CONSTRAINT chk_putaway_hu_type CHECK (handling_unit_type IN ('SSCC', 'CONTAINER')),
    ADD CONSTRAINT fk_putaway_assigned_location FOREIGN KEY (assigned_location) REFERENCES locations (code);

ALTER TABLE putaway_task_lines
    ADD CONSTRAINT fk_putaway_task_lines_task FOREIGN KEY (task_id) REFERENCES putaway_tasks (id) ON DELETE CASCADE;

CREATE INDEX idx_putaway_task_lines_task ON putaway_task_lines (task_id);
CREATE INDEX idx_locations_zone_status ON locations (zone, status);
CREATE INDEX idx_location_inventory_sku ON location_inventory (sku);
