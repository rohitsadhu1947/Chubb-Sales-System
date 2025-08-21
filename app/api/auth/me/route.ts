import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { sql } from "@/lib/db"

export async function GET() {
  try {
    const sessionToken = cookies().get("session_token")?.value

    if (!sessionToken) {
      return new NextResponse(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: {
          "Content-Type": "application/json",
        },
      })
    }

    // Get session with user
    const sessions = await sql`
      SELECT s.*, u.id as user_id, u.email, u.role 
      FROM sessions s
      JOIN users u ON s.user_id = u.id
      WHERE s.id = ${sessionToken} AND s.expires_at > NOW()
    `

    if (sessions.length === 0) {
      // Session expired or not found
      return new NextResponse(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: {
          "Content-Type": "application/json",
        },
      })
    }

    const user = sessions[0]

    return new NextResponse(
      JSON.stringify({
        id: user.user_id,
        username: user.email, // Use email as username
        fullName: user.email.split("@")[0], // Use part of email as full name
        email: user.email,
        role: user.role,
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
        },
      },
    )
  } catch (error) {
    console.error("Get current user error:", error)
    // Ensure we return JSON even in case of error
    return new NextResponse(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: {
        "Content-Type": "application/json",
      },
    })
  }
}
