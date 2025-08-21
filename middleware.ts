import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

// Define public routes that don't require authentication
const publicRoutes = ["/login"]

// Define module names for each route
const routeModules: Record<string, string> = {
  "/admin/dashboard": "dashboard",
  "/admin/commission-report": "commission_report",
  "/admin/clients": "clients",
  "/admin/products": "products",
  "/admin/brokers": "brokers",
  "/admin/sales-leads": "sales_leads",
  "/admin/client-product-mapping": "client_product_mapping",
  "/admin/sales-upload": "sales_upload",
  "/admin/users": "user_management",
  "/admin/permissions": "user_management",
}

// Define role-based access
const roleAccess: Record<string, string[]> = {
  admin: [
    "dashboard",
    "commission_report",
    "clients",
    "products",
    "brokers",
    "sales_leads",
    "client_product_mapping",
    "sales_upload",
    "user_management",
  ],
  viewer: ["dashboard", "commission_report"],
  dataentry: ["sales_upload"],
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Allow access to public routes
  if (publicRoutes.some((route) => pathname.startsWith(route))) {
    return NextResponse.next()
  }

  // Check if user is authenticated
  const sessionToken = request.cookies.get("session_token")?.value

  if (!sessionToken) {
    // Redirect to login if not authenticated
    return NextResponse.redirect(new URL("/login", request.url))
  }

  // For API routes, allow the request to proceed (we'll check auth in the handlers)
  if (pathname.startsWith("/api/")) {
    return NextResponse.next()
  }

  // Get user info and permissions
  const response = await fetch(new URL("/api/auth/me", request.url), {
    headers: {
      Cookie: `session_token=${sessionToken}`,
    },
  })

  if (!response.ok) {
    // Session is invalid, redirect to login
    return NextResponse.redirect(new URL("/login", request.url))
  }

  const user = await response.json()

  // Admin users can access everything
  if (user.role === "admin") {
    return NextResponse.next()
  }

  // For other users, check specific permissions
  // Find which module this route belongs to
  let moduleForRoute: string | undefined = undefined

  for (const [route, module] of Object.entries(routeModules)) {
    if (pathname.startsWith(route)) {
      moduleForRoute = module
      break
    }
  }

  // If we don't have a module mapping for this route, allow access
  if (!moduleForRoute) {
    return NextResponse.next()
  }

  // Check if user's role has access to this module
  if (roleAccess[user.role]?.includes(moduleForRoute)) {
    return NextResponse.next()
  }

  try {
    // Try to check permissions from the API
    const permResponse = await fetch(
      new URL(`/api/permissions/check?userId=${user.id}&module=${moduleForRoute}&permission=view`, request.url),
      {
        headers: {
          Cookie: `session_token=${sessionToken}`,
        },
      },
    )

    if (permResponse.ok) {
      const { hasPermission } = await permResponse.json()
      if (hasPermission) {
        return NextResponse.next()
      }
    }
  } catch (error) {
    console.error("Error checking permissions:", error)
    // If there's an error, fall back to role-based access
    if (roleAccess[user.role]?.includes(moduleForRoute)) {
      return NextResponse.next()
    }
  }

  // User doesn't have permission, redirect to dashboard
  return NextResponse.redirect(new URL("/admin/dashboard", request.url))
}

// Configure the middleware to run on specific paths
export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.png$).*)",
  ],
}
