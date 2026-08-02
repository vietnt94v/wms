--liquibase formatted sql

--changeset wms:003-receiving-schema
CREATE TABLE suppliers (
    id          VARCHAR(50) PRIMARY KEY,
    name        VARCHAR(255) NOT NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE products (
    sku                     VARCHAR(100) PRIMARY KEY,
    name                    VARCHAR(255) NOT NULL,
    uom                     VARCHAR(20) NOT NULL,
    requires_lot_expiry     BOOLEAN NOT NULL DEFAULT FALSE,
    shelf_life_days         INTEGER NULL,
    created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE asns (
    id              VARCHAR(50) PRIMARY KEY,
    supplier_id     VARCHAR(50) NOT NULL REFERENCES suppliers (id),
    type            VARCHAR(20) NOT NULL,
    carrier         VARCHAR(100) NOT NULL,
    plate_no        VARCHAR(50) NOT NULL,
    status          VARCHAR(30) NOT NULL,
    eta             TIMESTAMPTZ NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_asns_type CHECK (type IN ('SSCC', 'CONTAINER')),
    CONSTRAINT chk_asns_status CHECK (status IN (
        'EXPECTED', 'SCHEDULED', 'GATE_IN', 'UNLOADING', 'RECEIVING',
        'QC', 'DISCREPANCY', 'PUTAWAY', 'COMPLETED', 'REJECTED'
    ))
);

CREATE TABLE asn_lines (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    asn_id          VARCHAR(50) NOT NULL REFERENCES asns (id) ON DELETE CASCADE,
    sku             VARCHAR(100) NOT NULL REFERENCES products (sku),
    expected_qty    INTEGER NOT NULL,
    received_qty    INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT uq_asn_lines_asn_sku UNIQUE (asn_id, sku)
);

CREATE TABLE asn_pallets (
    sscc                VARCHAR(50) PRIMARY KEY,
    asn_id              VARCHAR(50) NOT NULL REFERENCES asns (id) ON DELETE CASCADE,
    destination_wh      VARCHAR(50) NOT NULL,
    blocked             BOOLEAN NOT NULL DEFAULT FALSE,
    damaged             BOOLEAN NOT NULL DEFAULT FALSE,
    received            BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE TABLE pallet_items (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sscc        VARCHAR(50) NOT NULL REFERENCES asn_pallets (sscc) ON DELETE CASCADE,
    sku         VARCHAR(100) NOT NULL REFERENCES products (sku),
    qty         INTEGER NOT NULL,
    lot         VARCHAR(100) NULL,
    expiry      DATE NULL
);

CREATE TABLE docks (
    id          VARCHAR(50) PRIMARY KEY,
    name        VARCHAR(100) NOT NULL,
    status      VARCHAR(20) NOT NULL DEFAULT 'AVAILABLE',
    CONSTRAINT chk_docks_status CHECK (status IN ('AVAILABLE', 'OCCUPIED', 'BLOCKED'))
);

CREATE TABLE appointments (
    id              VARCHAR(50) PRIMARY KEY,
    asn_id          VARCHAR(50) NOT NULL REFERENCES asns (id),
    dock_id         VARCHAR(50) NOT NULL REFERENCES docks (id),
    window_start    TIMESTAMPTZ NOT NULL,
    window_end      TIMESTAMPTZ NOT NULL,
    status          VARCHAR(20) NOT NULL DEFAULT 'BOOKED',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_appointments_status CHECK (status IN ('BOOKED', 'ARRIVED', 'CANCELLED', 'COMPLETED'))
);

CREATE TABLE receiving_sessions (
    id                      VARCHAR(50) PRIMARY KEY,
    asn_id                  VARCHAR(50) NOT NULL,
    dock_id                 VARCHAR(50) NOT NULL REFERENCES docks (id),
    mode                    VARCHAR(20) NOT NULL,
    status                  VARCHAR(30) NOT NULL,
    plate_no_entered        VARCHAR(50) NULL,
    unknown_arrival         BOOLEAN NOT NULL DEFAULT FALSE,
    supervisor_approved     BOOLEAN NOT NULL DEFAULT FALSE,
    created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_sessions_mode CHECK (mode IN ('SSCC', 'CONTAINER')),
    CONSTRAINT chk_sessions_status CHECK (status IN (
        'GATE_IN', 'UNLOADING', 'RECEIVING', 'QC',
        'DISCREPANCY', 'PUTAWAY', 'COMPLETED', 'REJECTED'
    ))
);

CREATE TABLE session_received_lines (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id      VARCHAR(50) NOT NULL REFERENCES receiving_sessions (id) ON DELETE CASCADE,
    sku             VARCHAR(100) NOT NULL REFERENCES products (sku),
    qty             INTEGER NOT NULL,
    lot             VARCHAR(100) NULL,
    expiry          DATE NULL,
    quarantine      BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE TABLE scan_events (
    id              VARCHAR(50) PRIMARY KEY,
    session_id      VARCHAR(50) NOT NULL REFERENCES receiving_sessions (id) ON DELETE CASCADE,
    code            VARCHAR(255) NOT NULL,
    kind            VARCHAR(20) NOT NULL,
    result          VARCHAR(10) NOT NULL,
    error_type      VARCHAR(50) NULL,
    message         TEXT NOT NULL,
    action_hint     TEXT NULL,
    ts              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_scan_kind CHECK (kind IN ('SSCC', 'SKU', 'CONTAINER')),
    CONSTRAINT chk_scan_result CHECK (result IN ('OK', 'WARN', 'BLOCK'))
);

CREATE TABLE session_ssccs (
    session_id      VARCHAR(50) NOT NULL REFERENCES receiving_sessions (id) ON DELETE CASCADE,
    sscc            VARCHAR(50) NOT NULL,
    PRIMARY KEY (session_id, sscc)
);

CREATE TABLE session_containers (
    session_id          VARCHAR(50) NOT NULL REFERENCES receiving_sessions (id) ON DELETE CASCADE,
    container_code      VARCHAR(255) NOT NULL,
    PRIMARY KEY (session_id, container_code)
);

CREATE TABLE discrepancies (
    id              VARCHAR(50) PRIMARY KEY,
    session_id      VARCHAR(50) NOT NULL REFERENCES receiving_sessions (id) ON DELETE CASCADE,
    asn_id          VARCHAR(50) NOT NULL,
    type            VARCHAR(30) NOT NULL,
    sku             VARCHAR(100) NULL,
    qty             INTEGER NOT NULL DEFAULT 0,
    note            TEXT NULL,
    resolution      VARCHAR(30) NOT NULL DEFAULT 'PENDING',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_disc_type CHECK (type IN (
        'OVER', 'SHORT', 'DAMAGED', 'WRONG_ITEM', 'QC_FAIL', 'UNKNOWN'
    )),
    CONSTRAINT chk_disc_resolution CHECK (resolution IN (
        'PENDING', 'ACCEPT_VARIANCE', 'REJECT', 'PARTIAL_ACCEPT', 'QUARANTINE', 'CLAIM_SUPPLIER'
    ))
);

CREATE TABLE qc_results (
    id              VARCHAR(50) PRIMARY KEY,
    session_id      VARCHAR(50) NOT NULL REFERENCES receiving_sessions (id) ON DELETE CASCADE,
    sku             VARCHAR(100) NOT NULL REFERENCES products (sku),
    sample_qty      INTEGER NOT NULL,
    pass            BOOLEAN NOT NULL,
    reason          TEXT NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_qc_session_sku UNIQUE (session_id, sku)
);

CREATE TABLE putaway_tasks (
    id                      VARCHAR(50) PRIMARY KEY,
    session_id              VARCHAR(50) NOT NULL REFERENCES receiving_sessions (id) ON DELETE CASCADE,
    asn_id                  VARCHAR(50) NOT NULL,
    sscc                    VARCHAR(50) NULL,
    sku                     VARCHAR(100) NOT NULL REFERENCES products (sku),
    qty                     INTEGER NOT NULL,
    suggested_location      VARCHAR(50) NOT NULL,
    status                  VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    quarantine              BOOLEAN NOT NULL DEFAULT FALSE,
    created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_putaway_status CHECK (status IN ('PENDING', 'CONFIRMED'))
);

CREATE TABLE inventory (
    sku             VARCHAR(100) PRIMARY KEY REFERENCES products (sku),
    available       INTEGER NOT NULL DEFAULT 0,
    quarantine      INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX idx_asns_status ON asns (status);
CREATE INDEX idx_asns_supplier ON asns (supplier_id);
CREATE INDEX idx_asn_lines_asn ON asn_lines (asn_id);
CREATE INDEX idx_asn_pallets_asn ON asn_pallets (asn_id);
CREATE INDEX idx_appointments_asn ON appointments (asn_id);
CREATE INDEX idx_appointments_dock ON appointments (dock_id);
CREATE INDEX idx_sessions_asn ON receiving_sessions (asn_id);
CREATE INDEX idx_sessions_dock ON receiving_sessions (dock_id);
CREATE INDEX idx_scan_events_session ON scan_events (session_id);
CREATE INDEX idx_discrepancies_session ON discrepancies (session_id);
CREATE INDEX idx_putaway_tasks_session ON putaway_tasks (session_id);
