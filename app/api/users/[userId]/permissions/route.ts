import { NextResponse } from "next/server"
import { getUserPermissions } from "@/lib/permissions"
import { getCurrentUser } from "@/lib/auth-actions"

export async function GET(request: Request, { params }: { params: { userId: string } }) {
  try {
    const userId = params.userId

    // Get current user
    const currentUser = await getCurrentUser()
    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Only admins can view other users' permissions
    if (currentUser.role !== "admin" && currentUser.id !== userId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const { permissions, error } = await getUserPermissions(userId)

    if (error) {
      return NextResponse.json({ error }, { status: 500 })
    }

    return NextResponse.json({ permissions })
  } catch (error) {
    console.error("Error fetching user permissions:", error)
    return NextResponse.json({ error: "Failed to fetch user permissions" }, { status: 500 })
  }
}
