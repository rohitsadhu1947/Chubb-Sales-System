-- Create roles table if it doesn't exist
CREATE TABLE IF NOT EXISTS roles (
  id UUID PRIMARY KEY,
  name VARCHAR(255) NOT NULL UNIQUE,
  description TEXT,
  is_system BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Insert default roles
INSERT INTO roles (id, name, description, is_system)
VALUES 
  (gen_random_uuid(), 'admin', 'Administrator with full access to all features', TRUE),
  (gen_random_uuid(), 'viewer', 'Read-only access to dashboard and reports', TRUE),
  (gen_random_uuid(), 'dataentry', 'Can enter and edit sales data', TRUE)
ON CONFLICT (name) DO NOTHING;

-- Add role_id column to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS role_id UUID REFERENCES roles(id);

-- Update existing users to use role_id instead of role string
UPDATE users u
SET role_id = r.id
FROM roles r
WHERE u.role = r.name AND u.role_id IS NULL;

-- Show the created tables
SELECT 'roles' as table_name, count(*) as record_count FROM roles;
