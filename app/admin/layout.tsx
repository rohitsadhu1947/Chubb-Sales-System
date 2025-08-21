import type React from "react"
import { redirect } from "next/navigation"
import AdminNavigation from "@/components/admin/admin-navigation"
import { UserNav } from "@/components/admin/user-nav"
import { getCurrentUser } from "@/lib/auth-actions"

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Get current user
  const user = await getCurrentUser()

  // Redirect to login if not authenticated
  if (!user) {
    redirect("/login")
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b">
        <div className="container flex h-16 items-center justify-between py-4">
          <h1 className="text-xl font-bold">Sales Dashboard</h1>
          <UserNav user={user} />
        </div>
      </div>
      <div className="container mx-auto py-6">
        <AdminNavigation userRole={user.role} />
        <div className="mt-6">{children}</div>
      </div>
    </div>
  )
}
