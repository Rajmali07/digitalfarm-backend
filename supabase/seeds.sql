-- Sample data
INSERT INTO profiles (id, role, farm_name, location) VALUES
('00000000-0000-0000-0000-000000000001', 'admin', 'Admin Farm', 'HQ'),
('00000000-0000-0000-0000-000000000002', 'farmer', 'Doe Farm', 'Zone A');

INSERT INTO animals (user_id, name, type) VALUES
('00000000-0000-0000-0000-000000000002', 'Cow1', 'cow'),
('00000000-0000-0000-0000-000000000002', 'Pig1', 'pig');

-- Run after schema and users setup

