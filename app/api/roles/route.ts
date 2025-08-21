import { NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { getCurrentUser } from "@/lib/auth-actions"
import { v4 as uuidv4 } from "uuid"

// GET all roles
export async function GET() {
  try {
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
      ORDER BY name ASC
    `

    return NextResponse.json({ roles })
  } catch (error) {
    console.error("Error fetching roles:", error)
    return NextResponse.json({ error: "Failed to fetch roles" }, { status: 500 })
  }
}

// POST create new role
export async function POST(request: Request) {
  try {
    // Get current user
    const currentUser = await getCurrentUser()
    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Only admins can create roles
    if (currentUser.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const { name, description } = await request.json()

    if (!name) {
      return NextResponse.json({ error: "Role name is required" }, { status: 400 })
    }

    // Check if role already exists
    const existingRoles = await sql`
      SELECT * FROM roles WHERE name = ${name}
    `

    if (existingRoles.length > 0) {
      return NextResponse.json({ error: "Role with this name already exists" }, { status: 400 })
    }

    // Create new role
    const id = uuidv4()
    await sql`
      INSERT INTO roles (id, name, description, is_system)
      VALUES (${id}, ${name}, ${description || null}, FALSE)
    `

    return NextResponse.json({ success: true, id })
  } catch (error) {
    console.error("Error creating role:", error)
    return NextResponse.json({ error: "Failed to create role" }, { status: 500 })
  }
}
