"use server"

import { sql } from "@/lib/db"
import { cache } from "react"
import { revalidatePath } from "next/cache"
import { v4 as uuidv4 } from "uuid"

// Types
export type Module = {
  id: string
  name: string
  description: string
}

export type Permission = {
  id: string
  moduleId: string
  moduleName: string
  name: string
  description: string
  granted: boolean
}

export type UserPermission = {
  userId: string
  permissionId: string
  moduleName: string
  permissionName: string
}

// Check if permissions tables exist and create them if they don't
export async function ensurePermissionTablesExist() {
  try {
    // Check if modules table exists
    const modulesTableExists = await sql`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'modules'
      );
    `

    const exists = modulesTableExists[0]?.exists || false

    if (!exists) {
      console.log("Permissions tables don't exist. Creating them automatically...")
      await createPermissionTables()
      return true
    }

    return exists
  } catch (error) {
    console.error("Error checking/creating permissions tables:", error)
    return false
  }
}

// Create permissions tables
async function createPermissionTables() {
  try {
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
      await sql`
        INSERT INTO modules (id, name, description)
        VALUES (${uuidv4()}, ${module.name}, ${module.description})
        ON CONFLICT (name) DO NOTHING
      `
    }

    // Get all modules to create permissions
    const modules = await sql`SELECT id, name FROM modules`

    // Create permissions for each module
    for (const module of modules) {
      // View permission
      await sql`
        INSERT INTO permissions (id, module_id, name, description)
        VALUES (
          ${uuidv4()}, 
          ${module.id}, 
          'view', 
          ${"Permission to view " + module.name}
        ) ON CONFLICT (module_id, name) DO NOTHING
      `

      // Edit permission
      await sql`
        INSERT INTO permissions (id, module_id, name, description)
        VALUES (
          ${uuidv4()}, 
          ${module.id}, 
          'edit', 
          ${"Permission to edit " + module.name}
        ) ON CONFLICT (module_id, name) DO NOTHING
      `

      // Delete permission
      await sql`
        INSERT INTO permissions (id, module_id, name, description)
        VALUES (
          ${uuidv4()}, 
          ${module.id}, 
          'delete', 
          ${"Permission to delete items in " + module.name}
        ) ON CONFLICT (module_id, name) DO NOTHING
      `
    }

    // Get admin users
    const adminUsers = await sql`SELECT id FROM users WHERE role = 'admin'`

    // Get all permissions
    const permissions = await sql`SELECT id FROM permissions`

    // Grant all permissions to admin users
    for (const user of adminUsers) {
      for (const permission of permissions) {
        await sql`
          INSERT INTO user_permissions (id, user_id, permission_id)
          VALUES (
            ${uuidv4()},
            ${user.id},
            ${permission.id}
          ) ON CONFLICT (user_id, permission_id) DO NOTHING
        `
      }
    }

    // Get viewer users
    const viewerUsers = await sql`SELECT id FROM users WHERE role = 'viewer'`

    // Grant view permissions to viewer users for dashboard and commission_report
    for (const user of viewerUsers) {
      for (const moduleName of ["dashboard", "commission_report"]) {
        const viewPermission = await sql`
          SELECT p.id
          FROM permissions p
          JOIN modules m ON p.module_id = m.id
          WHERE m.name = ${moduleName} AND p.name = 'view'
        `

        if (viewPermission.length > 0) {
          await sql`
            INSERT INTO user_permissions (id, user_id, permission_id)
            VALUES (
              ${uuidv4()},
              ${user.id},
              ${viewPermission[0].id}
            ) ON CONFLICT (user_id, permission_id) DO NOTHING
          `
        }
      }
    }

    // Get dataentry users
    const dataentryUsers = await sql`SELECT id FROM users WHERE role = 'dataentry'`

    // Get sales_upload module
    const salesUploadModule = await sql`SELECT id FROM modules WHERE name = 'sales_upload'`

    if (salesUploadModule.length > 0) {
      // Get view and edit permissions for sales_upload
      const salesUploadPermissions = await sql`
        SELECT id FROM permissions 
        WHERE module_id = ${salesUploadModule[0].id} AND name IN ('view', 'edit')
      `

      // Grant permissions to dataentry users
      for (const user of dataentryUsers) {
        for (const permission of salesUploadPermissions) {
          await sql`
            INSERT INTO user_permissions (id, user_id, permission_id)
            VALUES (
              ${uuidv4()},
              ${user.id},
              ${permission.id}
            ) ON CONFLICT (user_id, permission_id) DO NOTHING
          `
        }
      }
    }

    console.log("Permission tables created successfully")
    return { success: true }
  } catch (error) {
    console.error("Error creating permissions tables:", error)
    return { error: "Failed to create permissions tables" }
  }
}

// Check if a user has a specific permission
export const hasPermission = cache(async (userId: string, moduleName: string, permissionName = "view") => {
  try {
    // Ensure tables exist - this will automatically create them if needed
    const tablesExist = await ensurePermissionTablesExist()

    if (!tablesExist) {
      // Fall back to role-based permissions
      const userRole = await sql`
        SELECT role FROM users WHERE id = ${userId}
      `

      if (userRole.length === 0) return false

      const role = userRole[0].role

      // Admin users have all permissions
      if (role === "admin") return true

      // Viewer users can view dashboard and commission_report
      if (role === "viewer" && permissionName === "view") {
        return ["dashboard", "commission_report"].includes(moduleName)
      }

      // Data entry users can view and edit sales_upload
      if (role === "dataentry" && ["view", "edit"].includes(permissionName)) {
        return moduleName === "sales_upload"
      }

      return false
    }

    // Admin users have all permissions
    const userRole = await sql`
      SELECT role FROM users WHERE id = ${userId}
    `

    if (userRole.length > 0 && userRole[0].role === "admin") {
      return true
    }

    const result = await sql`
      SELECT 1
      FROM user_permissions up
      JOIN permissions p ON up.permission_id = p.id
      JOIN modules m ON p.module_id = m.id
      WHERE up.user_id = ${userId}
        AND m.name = ${moduleName}
        AND p.name = ${permissionName}
    `

    return result.length > 0
  } catch (error) {
    console.error(`Error checking permission ${moduleName}.${permissionName} for user ${userId}:`, error)

    // Fall back to role-based permissions if there's an error
    try {
      const userRole = await sql`
        SELECT role FROM users WHERE id = ${userId}
      `

      if (userRole.length === 0) return false

      const role = userRole[0].role

      // Admin users have all permissions
      if (role === "admin") return true

      // Viewer users can view dashboard and commission_report
      if (role === "viewer" && permissionName === "view") {
        return ["dashboard", "commission_report"].includes(moduleName)
      }

      // Data entry users can view and edit sales_upload
      if (role === "dataentry" && ["view", "edit"].includes(permissionName)) {
        return moduleName === "sales_upload"
      }
    } catch (innerError) {
      console.error("Error in fallback permission check:", innerError)
    }

    return false
  }
})

// Get all modules
export const getModules = cache(async () => {
  try {
    // Ensure tables exist
    const tablesExist = await ensurePermissionTablesExist()

    if (!tablesExist) {
      // Return empty array if tables don't exist
      return { modules: [] }
    }

    const modules = await sql`
      SELECT id, name, description
      FROM modules
      ORDER BY name ASC
    `
    return { modules }
  } catch (error) {
    console.error("Error fetching modules:", error)
    return { error: "Failed to fetch modules", modules: [] }
  }
})

// Get all permissions for a specific user
export const getUserPermissions = cache(async (userId: string) => {
  try {
    // Ensure tables exist
    const tablesExist = await ensurePermissionTablesExist()

    if (!tablesExist) {
      // Return empty array if tables don't exist
      return { permissions: [] }
    }

    const permissions = await sql`
      SELECT 
        p.id, 
        p.module_id as "moduleId", 
        m.name as "moduleName", 
        p.name, 
        p.description,
        CASE WHEN up.id IS NOT NULL THEN true ELSE false END as granted
      FROM permissions p
      JOIN modules m ON p.module_id = m.id
      LEFT JOIN user_permissions up ON p.id = up.permission_id AND up.user_id = ${userId}
      ORDER BY m.name, p.name
    `
    return { permissions }
  } catch (error) {
    console.error("Error fetching user permissions:", error)
    return { error: "Failed to fetch permissions", permissions: [] }
  }
})

// Grant a permission to a user
export async function grantPermission(userId: string, permissionId: string, grantedBy: string) {
  try {
    // Ensure tables exist
    const tablesExist = await ensurePermissionTablesExist()

    if (!tablesExist) {
      return { error: "Permission tables do not exist" }
    }

    await sql`
      INSERT INTO user_permissions (id, user_id, permission_id, granted_by)
      VALUES (${uuidv4()}, ${userId}, ${permissionId}, ${grantedBy})
      ON CONFLICT (user_id, permission_id) DO NOTHING
    `
    revalidatePath("/admin/permissions")
    return { success: true }
  } catch (error) {
    console.error("Error granting permission:", error)
    return { error: "Failed to grant permission" }
  }
}

// Revoke a permission from a user
export async function revokePermission(userId: string, permissionId: string) {
  try {
    // Ensure tables exist
    const tablesExist = await ensurePermissionTablesExist()

    if (!tablesExist) {
      return { error: "Permission tables do not exist" }
    }

    await sql`
      DELETE FROM user_permissions
      WHERE user_id = ${userId} AND permission_id = ${permissionId}
    `
    revalidatePath("/admin/permissions")
    return { success: true }
  } catch (error) {
    console.error("Error revoking permission:", error)
    return { error: "Failed to revoke permission" }
  }
}

// Get all users with their permissions
export const getUsersWithPermissions = cache(async () => {
  try {
    // Ensure tables exist
    const tablesExist = await ensurePermissionTablesExist()

    if (!tablesExist) {
      return { users: [] }
    }

    const users = await sql`
      SELECT id, email, role
      FROM users
      ORDER BY email ASC
    `

    const usersWithPermissions = await Promise.all(
      users.map(async (user) => {
        const { permissions } = await getUserPermissions(user.id)
        return {
          ...user,
          permissions: permissions || [],
        }
      }),
    )

    return { users: usersWithPermissions }
  } catch (error) {
    console.error("Error fetching users with permissions:", error)
    return { error: "Failed to fetch users with permissions", users: [] }
  }
})
