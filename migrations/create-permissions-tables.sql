-- Create modules table to define all available modules in the system
CREATE TABLE IF NOT EXISTS modules (
  id UUID PRIMARY KEY,
  name VARCHAR(255) NOT NULL UNIQUE,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create permissions table to define permission types
CREATE TABLE IF NOT EXISTS permissions (
  id UUID PRIMARY KEY,
  module_id UUID NOT NULL REFERENCES modules(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(module_id, name)
);

-- Create user_permissions table to associate users with permissions
CREATE TABLE IF NOT EXISTS user_permissions (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  permission_id UUID NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
  granted_by UUID REFERENCES users(id),
  granted_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, permission_id)
);

-- Insert default modules
INSERT INTO modules (id, name, description)
VALUES 
  (gen_random_uuid(), 'dashboard', 'Dashboard and analytics'),
  (gen_random_uuid(), 'clients', 'Client management'),
  (gen_random_uuid(), 'products', 'Product management'),
  (gen_random_uuid(), 'brokers', 'Broker management'),
  (gen_random_uuid(), 'sales_leads', 'Sales leads management'),
  (gen_random_uuid(), 'client_product_mapping', 'Client-product mapping'),
  (gen_random_uuid(), 'sales_upload', 'Sales data upload'),
  (gen_random_uuid(), 'commission_report', 'Commission reports'),
  (gen_random_uuid(), 'user_management', 'User and permission management')
ON CONFLICT (name) DO NOTHING;

-- Insert default permissions for each module
DO $$
DECLARE
  module_rec RECORD;
BEGIN
  FOR module_rec IN SELECT id, name FROM modules LOOP
    -- View permission
    INSERT INTO permissions (id, module_id, name, description)
    VALUES (
      gen_random_uuid(), 
      module_rec.id, 
      'view', 
      'Permission to view ' || module_rec.name
    ) ON CONFLICT (module_id, name) DO NOTHING;
    
    -- Edit permission
    INSERT INTO permissions (id, module_id, name, description)
    VALUES (
      gen_random_uuid(), 
      module_rec.id, 
      'edit', 
      'Permission to edit ' || module_rec.name
    ) ON CONFLICT (module_id, name) DO NOTHING;
    
    -- Delete permission
    INSERT INTO permissions (id, module_id, name, description)
    VALUES (
      gen_random_uuid(), 
      module_rec.id, 
      'delete', 
      'Permission to delete items in ' || module_rec.name
    ) ON CONFLICT (module_id, name) DO NOTHING;
  END LOOP;
END $$;

-- Grant all permissions to admin users
DO $$
DECLARE
  admin_user_rec RECORD;
  permission_rec RECORD;
BEGIN
  FOR admin_user_rec IN SELECT id FROM users WHERE role = 'admin' LOOP
    FOR permission_rec IN SELECT id FROM permissions LOOP
      INSERT INTO user_permissions (id, user_id, permission_id)
      VALUES (
        gen_random_uuid(),
        admin_user_rec.id,
        permission_rec.id
      ) ON CONFLICT (user_id, permission_id) DO NOTHING;
    END LOOP;
  END LOOP;
END $$;

-- Grant view permissions to viewer users for dashboard and commission_report
DO $$
DECLARE
  viewer_user_rec RECORD;
  module_name TEXT;
  permission_rec RECORD;
BEGIN
  FOR viewer_user_rec IN SELECT id FROM users WHERE role = 'viewer' LOOP
    FOR module_name IN ARRAY['dashboard', 'commission_report'] LOOP
      SELECT p.id INTO permission_rec
      FROM permissions p
      JOIN modules m ON p.module_id = m.id
      WHERE m.name = module_name AND p.name = 'view';
      
      IF FOUND THEN
        INSERT INTO user_permissions (id, user_id, permission_id)
        VALUES (
          gen_random_uuid(),
          viewer_user_rec.id,
          permission_rec.id
        ) ON CONFLICT (user_id, permission_id) DO NOTHING;
      END IF;
    END LOOP;
  END LOOP;
END $$;

-- Grant permissions to dataentry users for sales_upload (view, edit)
DO $$
DECLARE
  dataentry_user_rec RECORD;
  module_id UUID;
  permission_rec RECORD;
BEGIN
  SELECT id INTO module_id FROM modules WHERE name = 'sales_upload';
  
  IF FOUND THEN
    FOR dataentry_user_rec IN SELECT id FROM users WHERE role = 'dataentry' LOOP
      FOR permission_rec IN SELECT id FROM permissions WHERE module_id = module_id AND name IN ('view', 'edit') LOOP
        INSERT INTO user_permissions (id, user_id, permission_id)
        VALUES (
          gen_random_uuid(),
          dataentry_user_rec.id,
          permission_rec.id
        ) ON CONFLICT (user_id, permission_id) DO NOTHING;
      END LOOP;
    END LOOP;
  END IF;
END $$;

-- Show the created tables
SELECT 'modules' as table_name, count(*) as record_count FROM modules
UNION ALL
SELECT 'permissions' as table_name, count(*) as record_count FROM permissions
UNION ALL
SELECT 'user_permissions' as table_name, count(*) as record_count FROM user_permissions;
