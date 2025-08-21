import { type NextRequest, NextResponse } from "next/server"
import { hasPermission } from "@/lib/permissions"
import { getCurrentUser } from "@/lib/auth-actions"

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const userId = searchParams.get("userId")
    const moduleName = searchParams.get("module")
    const permissionName = searchParams.get("permission") || "view"

    if (!userId || !moduleName) {
      return NextResponse.json({ error: "Missing required parameters: userId and module" }, { status: 400 })
    }

    // Try to check permission using the database
    try {
      const permitted = await hasPermission(userId, moduleName, permissionName)
      return NextResponse.json({ hasPermission: permitted })
    } catch (dbError) {
      console.error("Error checking permission in database:", dbError)

      // Fall back to role-based permissions
      const currentUser = await getCurrentUser()
      if (!currentUser) {
        return NextResponse.json({ hasPermission: false })
      }

      // Check role-based permissions
      const hasRolePermission = checkRoleBasedPermission(currentUser.role, moduleName, permissionName)
      return NextResponse.json({ hasPermission: hasRolePermission })
    }
  } catch (error) {
    console.error("Error checking permission:", error)
    return NextResponse.json({ error: "Internal server error", hasPermission: false }, { status: 500 })
  }
}

// Function to check permissions based on user role
function checkRoleBasedPermission(role: string, moduleName: string, permissionName: string): boolean {
  // Admin users have all permissions
  if (role === "admin") {
    return true
  }

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
