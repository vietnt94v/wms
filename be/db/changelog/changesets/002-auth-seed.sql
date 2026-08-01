--liquibase formatted sql

--changeset wms:002-auth-seed
INSERT INTO roles (id, code, name) VALUES
    ('11111111-1111-1111-1111-111111111001', 'operator', 'Operator'),
    ('11111111-1111-1111-1111-111111111002', 'supervisor', 'Supervisor'),
    ('11111111-1111-1111-1111-111111111003', 'admin', 'Admin');

INSERT INTO users (id, username, password_hash, full_name, is_active) VALUES
    (
        '22222222-2222-2222-2222-222222222001',
        'admin',
        '$2b$10$1UBh8vLRBHfzG45/FusyQ.qZN.9MRKcxHV4ob/Qz2Lp6g/xDB3lFu',
        'System Admin',
        TRUE
    ),
    (
        '22222222-2222-2222-2222-222222222002',
        'supervisor',
        '$2b$10$1UBh8vLRBHfzG45/FusyQ.qZN.9MRKcxHV4ob/Qz2Lp6g/xDB3lFu',
        'Floor Supervisor',
        TRUE
    ),
    (
        '22222222-2222-2222-2222-222222222003',
        'operator',
        '$2b$10$1UBh8vLRBHfzG45/FusyQ.qZN.9MRKcxHV4ob/Qz2Lp6g/xDB3lFu',
        'Warehouse Operator',
        TRUE
    );

INSERT INTO user_roles (user_id, role_id) VALUES
    ('22222222-2222-2222-2222-222222222001', '11111111-1111-1111-1111-111111111003'),
    ('22222222-2222-2222-2222-222222222002', '11111111-1111-1111-1111-111111111002'),
    ('22222222-2222-2222-2222-222222222003', '11111111-1111-1111-1111-111111111001');
