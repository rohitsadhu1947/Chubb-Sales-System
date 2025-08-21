-- Create users table if it doesn't exist
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY,
  username VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  full_name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  role VARCHAR(50) NOT NULL CHECK (role IN ('admin', 'viewer', 'dataentry')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  last_login TIMESTAMP WITH TIME ZONE
);

-- Insert default admin user (password: admin123)
INSERT INTO users (id, username, password_hash, full_name, email, role)
SELECT 
  gen_random_uuid(), 
  'admin', 
  '$2b$10$EYQyxu4CFgQgVXMCJcZXHOXcKFYc3xjwGJh/CJnAYUkYdgUZX5/Hy', 
  'System Administrator', 
  'admin@example.com', 
  'admin'
WHERE NOT EXISTS (SELECT 1 FROM users WHERE username = 'admin');

-- Insert default viewer user (password: viewer123)
INSERT INTO users (id, username, password_hash, full_name, email, role)
SELECT 
  gen_random_uuid(), 
  'viewer', 
  '$2b$10$Hl8mo0JxoHQYTZsUuY9sAeKXBFrGYiYvAFO/MRXGKxTCKRqGGOYfO', 
  'Report Viewer', 
  'viewer@example.com', 
  'viewer'
WHERE NOT EXISTS (SELECT 1 FROM users WHERE username = 'viewer');

-- Insert default data entry user (password: data123)
INSERT INTO users (id, username, password_hash, full_name, email, role)
SELECT 
  gen_random_uuid(), 
  'dataentry', 
  '$2b$10$Hl8mo0JxoHQYTZsUuY9sAeKXBFrGYiYvAFO/MRXGKxTCKRqGGOYfO', 
  'Data Entry Operator', 
  'dataentry@example.com', 
  'dataentry'
WHERE NOT EXISTS (SELECT 1 FROM users WHERE username = 'dataentry');
