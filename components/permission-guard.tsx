"use client"

import type { ReactNode } from "react"
import { usePermissions } from "@/hooks/use-permissions"

interface PermissionGuardProps {
  moduleName: string
  permissionName?: string
  children: ReactNode
  fallback?: ReactNode
}

export function PermissionGuard({
  moduleName,
  permissionName = "view",
  children,
  fallback = null,
}: PermissionGuardProps) {
  const { checkPermission, isLoading } = usePermissions()

  // While loading permissions, don't render anything
  if (isLoading) {
    return null
  }

  // Check if user has the required permission
  const hasPermission = checkPermission(moduleName, permissionName)

  // If user has permission, render children, otherwise render fallback
  return hasPermission ? <>{children}</> : <>{fallback}</>
}
