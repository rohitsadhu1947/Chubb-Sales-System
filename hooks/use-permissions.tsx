"use client"

import { useAuth } from "@/components/auth-provider"
import { createContext, useContext, useState, useEffect, type ReactNode } from "react"

type PermissionsContextType = {
  checkPermission: (moduleName: string, permissionName?: string) => boolean
  isLoading: boolean
}

const PermissionsContext = createContext<PermissionsContextType>({
  checkPermission: () => false,
  isLoading: true,
})

export function PermissionsProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const [permissions, setPermissions] = useState<Record<string, string[]>>({})
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchPermissions = async () => {
      if (!user) {
        setPermissions({})
        setIsLoading(false)
        return
      }

      try {
        const res = await fetch(`/api/permissions?userId=${user.id}`)
        if (res.ok) {
          const data = await res.json()

          // Transform permissions into a more usable format
          const permMap: Record<string, string[]> = {}
          if (data.permissions && Array.isArray(data.permissions)) {
            data.permissions.forEach((perm: any) => {
              if (!permMap[perm.moduleName]) {
                permMap[perm.moduleName] = []
              }
              permMap[perm.moduleName].push(perm.name)
            })
          }

          setPermissions(permMap)
        } else {
          // If API fails, fall back to role-based permissions
          setPermissions(getRoleBasedPermissions(user.role))
        }
      } catch (error) {
        console.error("Error fetching permissions:", error)
        // Fall back to role-based permissions
        setPermissions(getRoleBasedPermissions(user.role))
      } finally {
        setIsLoading(false)
      }
    }

    fetchPermissions()
  }, [user])

  const checkPermission = (moduleName: string, permissionName = "view") => {
    // Admin role has all permissions
    if (user?.role === "admin") return true

    // Check if user has the specific permission
    return !!permissions[moduleName]?.includes(permissionName)
  }

  return <PermissionsContext.Provider value={{ checkPermission, isLoading }}>{children}</PermissionsContext.Provider>
}

export const usePermissions = () => useContext(PermissionsContext)

// Helper function to get role-based permissions
function getRoleBasedPermissions(role?: string): Record<string, string[]> {
  const permissions: Record<string, string[]> = {}

  if (role === "admin") {
    // Admin has all permissions
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

    modules.forEach((module) => {
      permissions[module] = ["view", "edit", "delete"]
    })
  } else if (role === "viewer") {
    // Viewer can only view dashboard and commission_report
    permissions["dashboard"] = ["view"]
    permissions["commission_report"] = ["view"]
  } else if (role === "dataentry") {
    // Data entry can view and edit sales_upload
    permissions["sales_upload"] = ["view", "edit"]
  }

  return permissions
}
