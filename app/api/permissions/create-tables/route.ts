import { NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { getCurrentUser } from "@/lib/auth-actions"
import { v4 as uuidv4 } from "uuid"

export async function POST() {
  try {
    // Get current user
    const currentUser = await getCurrentUser()
    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Only admins can create tables
    if (currentUser.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    // Create modules table
    await sql`
      CREATE TABLE IF NOT EXISTS modules (
        id UUID PRIMARY KEY,
        name VARCHAR(255) NOT NULL UNIQUE,
        description TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `

    // Create permissions table
    await sql`
      CREATE TABLE IF NOT EXISTS permissions (
        id UUID PRIMARY KEY,
        module_id UUID NOT NULL REFERENCES modules(id) ON DELETE CASCADE,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(module_id, name)
      )
    `

    // Create user_permissions table
    await sql`
      CREATE TABLE IF NOT EXISTS user_permissions (
        id UUID PRIMARY KEY,
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        permission_id UUID NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
        granted_by UUID REFERENCES users(id),
        granted_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, permission_id)
      )
    `

    // Insert default modules
    const moduleData = [
      { name: "dashboard", description: "Dashboard and analytics" },
      { name: "clients", description: "Client management" },
      { name: "products", description: "Product management" },
      { name: "brokers", description: "Broker management" },
      { name: "sales_leads", description: "Sales leads management" },
      { name: "client_product_mapping", description: "Client-product mapping" },
      { name: "sales_upload", description: "Sales data upload" },
      { name: "commission_report", description: "Commission reports" },
      { name: "user_management", description: "User and permission management" },
    ]

    // Insert modules one by one
    for (const module of moduleData) {
      const moduleId = uuidv4()
      await sql`
        INSERT INTO modules (id, name, description)
        VALUES (${moduleId}, ${module.name}, ${module.description})
        ON CONFLICT (name) DO NOTHING
      `

      // Create permissions for this module
      const permissionTypes = [
        { name: "view", description: `Permission to view ${module.name}` },
        { name: "edit", description: `Permission to edit ${module.name}` },
        { name: "delete", description: `Permission to delete items in ${module.name}` },
      ]

      for (const perm of permissionTypes) {
        await sql`
          INSERT INTO permissions (id, module_id, name, description)
          SELECT ${uuidv4()}, m.id, ${perm.name}, ${perm.description}
          FROM modules m
          WHERE m.name = ${module.name}
          ON CONFLICT (module_id, name) DO NOTHING
        `
      }
    }

    // Grant all permissions to admin users
    await sql`
      INSERT INTO user_permissions (id, user_id, permission_id)
      SELECT 
        gen_random_uuid(), 
        u.id, 
        p.id
      FROM 
        users u, 
        permissions p
      WHERE 
        u.role = 'admin'
      ON CONFLICT (user_id, permission_id) DO NOTHING
    `

    // Grant view permissions to viewer users for dashboard and commission_report
    await sql`
      INSERT INTO user_permissions (id, user_id, permission_id)
      SELECT 
        gen_random_uuid(), 
        u.id, 
        p.id
      FROM 
        users u, 
        permissions p,
        modules m
      WHERE 
        u.role = 'viewer'
        AND p.module_id = m.id
        AND m.name IN ('dashboard', 'commission_report')
        AND p.name = 'view'
      ON CONFLICT (user_id, permission_id) DO NOTHING
    `

    // Grant view and edit permissions to dataentry users for sales_upload
    await sql`
      INSERT INTO user_permissions (id, user_id, permission_id)
      SELECT 
        gen_random_uuid(), 
        u.id, 
        p.id
      FROM 
        users u, 
        permissions p,
        modules m
      WHERE 
        u.role = 'dataentry'
        AND p.module_id = m.id
        AND m.name = 'sales_upload'
        AND p.name IN ('view', 'edit')
      ON CONFLICT (user_id, permission_id) DO NOTHING
    `

    // Count records in tables
    const moduleCount = await sql`SELECT COUNT(*) as count FROM modules`
    const permissionCount = await sql`SELECT COUNT(*) as count FROM permissions`
    const userPermissionCount = await sql`SELECT COUNT(*) as count FROM user_permissions`

    return NextResponse.json({
      success: true,
      counts: {
        modules: moduleCount[0]?.count || 0,
        permissions: permissionCount[0]?.count || 0,
        userPermissions: userPermissionCount[0]?.count || 0,
      },
    })
  } catch (error) {
    console.error("Error creating permission tables:", error)
    return NextResponse.json({ error: "Failed to create permission tables" }, { status: 500 })
  }
}
