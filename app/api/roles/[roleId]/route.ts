import { NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { getCurrentUser } from "@/lib/auth-actions"

// GET a specific role
export async function GET(request: Request, { params }: { params: { roleId: string } }) {
  try {
    const roleId = params.roleId

    // Get current user
    const currentUser = await getCurrentUser()
    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Only admins can view roles
    if (currentUser.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const roles = await sql`
      SELECT id, name, description, is_system, created_at
      FROM roles
      WHERE id = ${roleId}
    `

    if (roles.length === 0) {
      return NextResponse.json({ error: "Role not found" }, { status: 404 })
    }

    return NextResponse.json({ role: roles[0] })
  } catch (error) {
    console.error("Error fetching role:", error)
    return NextResponse.json({ error: "Failed to fetch role" }, { status: 500 })
  }
}

// PUT update a role
export async function PUT(request: Request, { params }: { params: { roleId: string } }) {
  try {
    const roleId = params.roleId

    // Get current user
    const currentUser = await getCurrentUser()
    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Only admins can update roles
    if (currentUser.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const { name, description } = await request.json()

    if (!name) {
      return NextResponse.json({ error: "Role name is required" }, { status: 400 })
    }

    // Check if role exists
    const existingRoles = await sql`
      SELECT * FROM roles WHERE id = ${roleId}
    `

    if (existingRoles.length === 0) {
      return NextResponse.json({ error: "Role not found" }, { status: 404 })
    }

    // Check if role is a system role
    if (existingRoles[0].is_system) {
      return NextResponse.json({ error: "Cannot modify system roles" }, { status: 400 })
    }

    // Check if name already exists for another role
    const nameExists = await sql`
      SELECT * FROM roles WHERE name = ${name} AND id != ${roleId}
    `

    if (nameExists.length > 0) {
      return NextResponse.json({ error: "Role with this name already exists" }, { status: 400 })
    }

    // Update role
    await sql`
      UPDATE roles
      SET name = ${name}, description = ${description || null}
      WHERE id = ${roleId}
    `

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error updating role:", error)
    return NextResponse.json({ error: "Failed to update role" }, { status: 500 })
  }
}

// DELETE a role
export async function DELETE(request: Request, { params }: { params: { roleId: string } }) {
  try {
    const roleId = params.roleId

    // Get current user
    const currentUser = await getCurrentUser()
    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Only admins can delete roles
    if (currentUser.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    // Check if role exists
    const existingRoles = await sql`
      SELECT * FROM roles WHERE id = ${roleId}
    `

    if (existingRoles.length === 0) {
      return NextResponse.json({ error: "Role not found" }, { status: 404 })
    }

    // Check if role is a system role
    if (existingRoles[0].is_system) {
      return NextResponse.json({ error: "Cannot delete system roles" }, { status: 400 })
    }

    // Check if role is in use
    const usersWithRole = await sql`
      SELECT COUNT(*) as count FROM users WHERE role_id = ${roleId}
    `

    if (usersWithRole[0].count > 0) {
      return NextResponse.json({ error: "Cannot delete role that is assigned to users" }, { status: 400 })
    }

    // Delete role
    await sql`
      DELETE FROM roles WHERE id = ${roleId}
    `

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting role:", error)
    return NextResponse.json({ error: "Failed to delete role" }, { status: 500 })
  }
}
