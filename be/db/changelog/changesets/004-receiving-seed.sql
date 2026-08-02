--liquibase formatted sql

--changeset wms:004-receiving-seed
INSERT INTO suppliers (id, name) VALUES
    ('SUP-01', 'Acme Supplies'),
    ('SUP-02', 'Northwind Trading');

INSERT INTO products (sku, name, uom, requires_lot_expiry, shelf_life_days) VALUES
    ('SKU-MILK-1L', 'UHT Milk 1L', 'EA', TRUE, 90),
    ('SKU-RICE-5KG', 'Jasmine Rice 5kg', 'BAG', FALSE, NULL),
    ('SKU-SOAP-100', 'Hand Soap 100ml', 'EA', FALSE, NULL),
    ('SKU-OIL-1L', 'Cooking Oil 1L', 'EA', TRUE, 365);

INSERT INTO docks (id, name, status) VALUES
    ('D01', 'Dock 01', 'AVAILABLE'),
    ('D02', 'Dock 02', 'AVAILABLE'),
    ('D03', 'Dock 03', 'AVAILABLE'),
    ('D04', 'Dock 04', 'AVAILABLE'),
    ('D05', 'Dock 05', 'AVAILABLE');

INSERT INTO inventory (sku, available, quarantine) VALUES
    ('SKU-MILK-1L', 0, 0),
    ('SKU-RICE-5KG', 0, 0),
    ('SKU-SOAP-100', 0, 0),
    ('SKU-OIL-1L', 0, 0);

INSERT INTO asns (id, supplier_id, type, carrier, plate_no, status, eta) VALUES
    ('ASN-9001', 'SUP-01', 'SSCC', 'VietTrans', '51C-12345', 'EXPECTED', NOW()),
    ('ASN-9002', 'SUP-02', 'CONTAINER', 'FastHaul', '51C-67890', 'EXPECTED', NOW());

INSERT INTO asn_lines (asn_id, sku, expected_qty, received_qty) VALUES
    ('ASN-9001', 'SKU-MILK-1L', 200, 0),
    ('ASN-9001', 'SKU-RICE-5KG', 50, 0),
    ('ASN-9002', 'SKU-SOAP-100', 500, 0),
    ('ASN-9002', 'SKU-OIL-1L', 120, 0);

INSERT INTO asn_pallets (sscc, asn_id, destination_wh, blocked, damaged, received) VALUES
    ('00012345678901234567', 'ASN-9001', 'WH-01', FALSE, FALSE, FALSE),
    ('00012345678901234568', 'ASN-9001', 'WH-01', FALSE, FALSE, FALSE),
    ('00012345678901234999', 'ASN-9001', 'WH-02', FALSE, FALSE, FALSE);

INSERT INTO pallet_items (sscc, sku, qty, lot, expiry) VALUES
    ('00012345678901234567', 'SKU-MILK-1L', 100, 'LOT-A1', '2026-12-01'),
    ('00012345678901234567', 'SKU-RICE-5KG', 25, NULL, NULL),
    ('00012345678901234568', 'SKU-MILK-1L', 100, 'LOT-A2', '2026-12-15'),
    ('00012345678901234568', 'SKU-RICE-5KG', 25, NULL, NULL),
    ('00012345678901234999', 'SKU-MILK-1L', 20, 'LOT-X', '2026-11-01');
