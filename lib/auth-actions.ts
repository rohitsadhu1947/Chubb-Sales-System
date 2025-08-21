"use server"

import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { sql } from "@/lib/db"
import { v4 as uuidv4 } from "uuid"
import type { User } from "@/lib/db"

// Session duration in seconds (24 hours)
const SESSION_DURATION = 24 * 60 * 60

// Login action
export async function login(formData: FormData) {
  // Use email instead of username for authentication
  const email = formData.get("username") as string // Keep the form field name as "username" for now
  const password = formData.get("password") as string

  if (!email || !password) {
    return { error: "Email and password are required" }
  }

  try {
    // First check if the roles table exists
    const rolesTableExists = await sql`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'roles'
      );
    `

    const hasRolesTable = rolesTableExists[0]?.exists || false

    // Get user by email with appropriate query based on table existence
    let users

    if (hasRolesTable) {
      // If roles table exists, join with it
      users = await sql`
        SELECT u.*, r.name as role_name
        FROM users u
        LEFT JOIN roles r ON u.role_id = r.id
        WHERE u.email = ${email}
      `
    } else {
      // Otherwise, just get the user with the role column
      users = await sql`
        SELECT * FROM users WHERE email = ${email}
      `
    }

    if (users.length === 0) {
      return { error: "Invalid email or password" }
    }

    const user = users[0]

    // Compare passwords directly since we're storing plain text passwords
    // Note: In a production environment, you should use hashed passwords
    if (user.password !== password) {
      return { error: "Invalid email or password" }
    }

    // Generate session token
    const sessionToken = uuidv4()
    const expiresAt = new Date(Date.now() + SESSION_DURATION * 1000).toISOString()

    // Create sessions table if it doesn't exist
    await sql`
      CREATE TABLE IF NOT EXISTS sessions (
        id UUID PRIMARY KEY,
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `

    // Store session in database
    await sql`
      INSERT INTO sessions (id, user_id, expires_at)
      VALUES (${sessionToken}, ${user.id}, ${expiresAt})
    `

    // Set session cookie
    cookies().set("session_token", sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: SESSION_DURATION,
      path: "/",
    })

    // Use role_name if available (from roles table), otherwise fall back to role column
    const userRole = user.role_name || user.role
    return { success: true, role: userRole }
  } catch (error) {
    console.error("Login error:", error)
    return { error: "An error occurred during login" }
  }
}

// Logout action
export async function logout() {
  const sessionToken = cookies().get("session_token")?.value

  if (sessionToken) {
    try {
      // Delete session from database
      await sql`
        DELETE FROM sessions WHERE id = ${sessionToken}
      `
    } catch (error) {
      console.error("Error deleting session:", error)
    }

    // Clear session cookie
    cookies().delete("session_token")
  }

  redirect("/login")
}

// Update the getCurrentUser function to handle the case where the roles table doesn't exist yet

// Get current user
export async function getCurrentUser(): Promise<User | null> {
  const sessionToken = cookies().get("session_token")?.value

  if (!sessionToken) {
    return null
  }

  try {
    // First check if the roles table exists
    const rolesTableExists = await sql`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'roles'
      );
    `

    const hasRolesTable = rolesTableExists[0]?.exists || false

    // Get session with user with appropriate query based on table existence
    let sessions

    if (hasRolesTable) {
      // If roles table exists, join with it
      sessions = await sql`
        SELECT s.*, u.*, COALESCE(r.name, u.role) as role
        FROM sessions s
        JOIN users u ON s.user_id = u.id
        LEFT JOIN roles r ON u.role_id = r.id
        WHERE s.id = ${sessionToken} AND s.expires_at > NOW()
      `
    } else {
      // Otherwise, just get the user with the role column
      sessions = await sql`
        SELECT s.*, u.*
        FROM sessions s
        JOIN users u ON s.user_id = u.id
        WHERE s.id = ${sessionToken} AND s.expires_at > NOW()
      `
    }

    if (sessions.length === 0) {
      // Session expired or not found
      cookies().delete("session_token")
      return null
    }

    const user = sessions[0]

    return {
      id: user.id,
      email: user.email,
      role: user.role,
      role_id: user.role_id,
      username: user.username || user.email,
      full_name: user.full_name || user.email.split("@")[0],
    } as User
  } catch (error) {
    console.error("Get current user error:", error)
    return null
  }
}

// Check if user has required role
export async function checkUserRole(requiredRoles: string[]): Promise<boolean> {
  const user = await getCurrentUser()

  if (!user) {
    return false
  }

  return requiredRoles.includes(user.role)
}

// Update the getUsers function to handle the case where the roles table doesn't exist yet

// Get all users (admin only)
export async function getUsers() {
  const currentUser = await getCurrentUser()

  // Only admins can view all users
  if (!currentUser || currentUser.role !== "admin") {
    return { error: "Unauthorized", users: [] }
  }

  try {
    // First check if the roles table exists
    const rolesTableExists = await sql`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'roles'
      );
    `

    const hasRolesTable = rolesTableExists[0]?.exists || false

    let users

    if (hasRolesTable) {
      // If roles table exists, join with it
      users = await sql`
        SELECT u.id, u.username, u.full_name, u.email, COALESCE(r.name, u.role) as role, 
               u.role_id, u.created_at, u.last_login
        FROM users u
        LEFT JOIN roles r ON u.role_id = r.id
        ORDER BY u.email ASC
      `
    } else {
      // Otherwise, just get users with the role column
      users = await sql`
        SELECT id, username, full_name, email, role, created_at, last_login
        FROM users
        ORDER BY email ASC
      `
    }

    return { users }
  } catch (error) {
    console.error("Get users error:", error)
    return { error: "Failed to fetch users", users: [] }
  }
}

// Update the createUser function to handle the case where the roles table doesn't exist yet

// Create a new user (admin only)
export async function createUser(formData: FormData) {
  const currentUser = await getCurrentUser()

  // Only admins can create users
  if (!currentUser || currentUser.role !== "admin") {
    return { error: "Unauthorized" }
  }

  const username = formData.get("username") as string
  const full_name = formData.get("full_name") as string
  const email = formData.get("email") as string
  const password = formData.get("password") as string
  const role_id = formData.get("role_id") as string
  const role = formData.get("role") as string

  if (!username || !email || !password || (!role_id && !role) || !full_name) {
    return { error: "All fields are required" }
  }

  try {
    // Check if email already exists
    const existingUsers = await sql`
      SELECT * FROM users WHERE email = ${email}
    `

    if (existingUsers.length > 0) {
      return { error: "Email already exists" }
    }

    // Check if username already exists
    const existingUsernames = await sql`
      SELECT * FROM users WHERE username = ${username}
    `

    if (existingUsernames.length > 0) {
      return { error: "Username already exists" }
    }

    // First check if the roles table exists
    const rolesTableExists = await sql`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'roles'
      );
    `

    const hasRolesTable = rolesTableExists[0]?.exists || false

    // Create user based on which role system is being used
    const id = uuidv4()

    if (hasRolesTable && role_id) {
      // Check if role exists
      const existingRoles = await sql`
        SELECT * FROM roles WHERE id = ${role_id}
      `

      if (existingRoles.length === 0) {
        return { error: "Invalid role" }
      }

      // Create user with role_id
      await sql`
        INSERT INTO users (id, username, full_name, email, password, role_id)
        VALUES (${id}, ${username}, ${full_name}, ${email}, ${password}, ${role_id})
      `
    } else {
      // Create user with role column
      await sql`
        INSERT INTO users (id, username, full_name, email, password, role)
        VALUES (${id}, ${username}, ${full_name}, ${email}, ${password}, ${role || "viewer"})
      `
    }

    return { success: true }
  } catch (error) {
    console.error("Create user error:", error)
    return { error: "An error occurred while creating user" }
  }
}

// Update the updateUser function to handle the case where the roles table doesn't exist yet

// Update user (admin only)
export async function updateUser(userId: string, formData: FormData) {
  const currentUser = await getCurrentUser()

  // Only admins can update users
  if (!currentUser || currentUser.role !== "admin") {
    return { error: "Unauthorized" }
  }

  const full_name = formData.get("full_name") as string
  const email = formData.get("email") as string
  const password = formData.get("password") as string
  const role_id = formData.get("role_id") as string
  const role = formData.get("role") as string

  if (!email || (!role_id && !role) || !full_name) {
    return { error: "Email, full name, and role are required" }
  }

  try {
    // Check if email already exists for another user
    const existingUsers = await sql`
      SELECT * FROM users WHERE email = ${email} AND id != ${userId}
    `

    if (existingUsers.length > 0) {
      return { error: "Email already exists" }
    }

    // First check if the roles table exists
    const rolesTableExists = await sql`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'roles'
      );
    `

    const hasRolesTable = rolesTableExists[0]?.exists || false

    if (hasRolesTable && role_id) {
      // Check if role exists
      const existingRoles = await sql`
        SELECT * FROM roles WHERE id = ${role_id}
      `

      if (existingRoles.length === 0) {
        return { error: "Invalid role" }
      }

      // Update user with role_id
      if (password) {
        await sql`
          UPDATE users 
          SET email = ${email}, full_name = ${full_name}, role_id = ${role_id}, password = ${password}
          WHERE id = ${userId}
        `
      } else {
        await sql`
          UPDATE users 
          SET email = ${email}, full_name = ${full_name}, role_id = ${role_id}
          WHERE id = ${userId}
        `
      }
    } else {
      // Update user with role column
      if (password) {
        await sql`
          UPDATE users 
          SET email = ${email}, full_name = ${full_name}, role = ${role}, password = ${password}
          WHERE id = ${userId}
        `
      } else {
        await sql`
          UPDATE users 
          SET email = ${email}, full_name = ${full_name}, role = ${role}
          WHERE id = ${userId}
        `
      }
    }

    return { success: true }
  } catch (error) {
    console.error("Update user error:", error)
    return { error: "An error occurred while updating user" }
  }
}

// Delete user (admin only)
export async function deleteUser(userId: string) {
  const currentUser = await getCurrentUser()

  // Only admins can delete users
  if (!currentUser || currentUser.role !== "admin") {
    return { error: "Unauthorized" }
  }

  // Prevent deleting yourself
  if (currentUser.id === userId) {
    return { error: "You cannot delete your own account" }
  }

  try {
    // Delete user's sessions first
    try {
      await sql`
        DELETE FROM sessions WHERE user_id = ${userId}
      `
    } catch (error) {
      console.error("Error deleting sessions:", error)
      // Continue even if sessions table doesn't exist
    }

    // Delete user
    await sql`
      DELETE FROM users WHERE id = ${userId}
    `

    return { success: true }
  } catch (error) {
    console.error("Delete user error:", error)
    return { error: "An error occurred while deleting user" }
  }
}
