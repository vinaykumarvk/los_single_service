-- Seed data for Auth Service
-- Creates sample users for testing

-- Note: Default admin user is already created by the service on startup
-- These are additional test users with different roles

-- Test users (password: Test@123 for all - bcrypt hash)
-- You should change these in production!
INSERT INTO users (username, email, password_hash, roles, is_active)
VALUES
  ('sales1', 'sales1@los.local', '$2b$10$rQZ5y5h5dQ5q5q5q5q5quO5q5q5q5q5q5q5q5q5q5q5q5q5q5q5q5q', ARRAY['sales', 'applicant'], true),
  ('maker1', 'maker1@los.local', '$2b$10$rQZ5y5h5dQ5q5q5q5q5quO5q5q5q5q5q5q5q5q5q5q5q5q5q5q5q5q', ARRAY['maker', 'underwriter'], true),
  ('checker1', 'checker1@los.local', '$2b$10$rQZ5y5h5dQ5q5q5q5q5quO5q5q5q5q5q5q5q5q5q5q5q5q5q5q5q5q', ARRAY['checker', 'risk'], true),
  ('ops1', 'ops1@los.local', '$2b$10$rQZ5y5h5dQ5q5q5q5q5quO5q5q5q5q5q5q5q5q5q5q5q5q5q5q5q5q', ARRAY['ops', 'verification'], true)
ON CONFLICT (username) DO NOTHING;

-- Note: The password hash above is a placeholder. 
-- In production, use: bcrypt.hash('Test@123', 10)
-- For now, the service will create users on first login or use the default admin user

