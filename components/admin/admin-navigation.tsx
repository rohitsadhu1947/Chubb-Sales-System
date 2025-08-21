"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { usePermissions } from "@/hooks/use-permissions"

// Define navigation items with module names
const navItems = [
  { name: "Dashboard", href: "/admin/dashboard", module: "dashboard" },
  { name: "Commission Report", href: "/admin/commission-report", module: "commission_report" },
  { name: "Clients", href: "/admin/clients", module: "clients" },
  { name: "Products", href: "/admin/products", module: "products" },
  { name: "Brokers", href: "/admin/brokers", module: "brokers" },
  { name: "Sales Leads", href: "/admin/sales-leads", module: "sales_leads" },
  { name: "Client Product Mapping", href: "/admin/client-product-mapping", module: "client_product_mapping" },
  { name: "Sales Upload", href: "/admin/sales-upload", module: "sales_upload" },
  { name: "User Management", href: "/admin/users", module: "user_management" },
  { name: "Roles", href: "/admin/roles", module: "user_management" },
  { name: "Permissions", href: "/admin/permissions", module: "user_management" },
]

export default function AdminNavigation() {
  const pathname = usePathname()
  const { checkPermission, isLoading } = usePermissions()

  // If permissions are still loading, show nothing
  if (isLoading) {
    return null
  }

  // Filter navigation items based on user permissions
  const filteredNavItems = navItems.filter((item) => checkPermission(item.module, "view"))

  return (
    <div className="border-b">
      <nav className="flex space-x-4 overflow-x-auto pb-2">
        {filteredNavItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "px-3 py-2 text-sm font-medium transition-colors whitespace-nowrap",
              pathname === item.href
                ? "border-b-2 border-primary text-primary"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {item.name}
          </Link>
        ))}
      </nav>
    </div>
  )
}
