import { type NextRequest, NextResponse } from "next/server"
import { getUserPermissions, ensurePermissionTablesExist } from "@/lib/permissions"
import { getCurrentUser } from "@/lib/auth-actions"

export async function GET(request: NextRequest) {
  try {
    // Get current user
    const currentUser = await getCurrentUser()
    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get requested user ID
    const searchParams = request.nextUrl.searchParams
    const userId = searchParams.get("userId")

    // If requesting permissions for another user, check if current user is admin
    if (userId && userId !== currentUser.id) {
      const isAdmin = currentUser.role === "admin"
      if (!isAdmin) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 })
      }
    }

    // Ensure permissions tables exist - this will automatically create them if needed
    const tablesExist = await ensurePermissionTablesExist()

    if (!tablesExist) {
      // If tables couldn't be created, return role-based permissions instead
      return handleRoleBasedPermissions(currentUser.role)
    }

    // Get permissions for the requested user or current user
    const { permissions, error } = await getUserPermissions(userId || currentUser.id)

    if (error) {
      // If there's an error getting permissions, fall back to role-based permissions
      return handleRoleBasedPermissions(currentUser.role)
    }

    // Transform permissions to a simpler format for the client
    const simplifiedPermissions = permissions
      .filter((p) => p.granted)
      .map((p) => ({
        moduleName: p.moduleName,
        name: p.name,
      }))

    return NextResponse.json({ permissions: simplifiedPermissions })
  } catch (error) {
    console.error("Error in permissions API:", error)

    // Get current user for fallback
    try {
      const currentUser = await getCurrentUser()
      if (currentUser) {
        return handleRoleBasedPermissions(currentUser.role)
      }
    } catch (innerError) {
      console.error("Error getting current user for fallback:", innerError)
    }

    return NextResponse.json({ permissions: [] })
  }
}

// Fallback function to provide permissions based on user role
function handleRoleBasedPermissions(role: string) {
  const permissions = []

  // Admin users have all permissions
  if (role === "admin") {
    const modules = [
      "dashboard",
      "clients",
      "products",
      "brokers",
      "sales_leads",
      "client_product_mapping",
      "sales_upload",
      "commission_report",
      "user_management",
    ]

    for (const moduleName of modules) {
      permissions.push({ moduleName, name: "view" }, { moduleName, name: "edit" }, { moduleName, name: "delete" })
    }
  }
  // Viewer users can view dashboard and commission_report
  else if (role === "viewer") {
    permissions.push({ moduleName: "dashboard", name: "view" }, { moduleName: "commission_report", name: "view" })
  }
  // Data entry users can view and edit sales_upload
  else if (role === "dataentry") {
    permissions.push({ moduleName: "sales_upload", name: "view" }, { moduleName: "sales_upload", name: "edit" })
  }

  return NextResponse.json({ permissions })
}
