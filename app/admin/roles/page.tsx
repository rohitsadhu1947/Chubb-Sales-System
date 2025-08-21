"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { DataTable } from "@/components/ui/data-table"
import { RoleForm } from "@/components/admin/role-form"
import { DeleteConfirmation } from "@/components/admin/delete-confirmation"
import { Plus, AlertCircle } from "lucide-react"
import { useRouter } from "next/navigation"
import { format } from "date-fns"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"

interface Role {
  id: string
  name: string
  description: string
  is_system: boolean
  created_at: string
}

export default function RolesPage() {
  const router = useRouter()
  const [roles, setRoles] = useState<Role[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [isDeleteOpen, setIsDeleteOpen] = useState(false)
  const [selectedRole, setSelectedRole] = useState<Role | null>(null)

  // Fetch roles on component mount
  useEffect(() => {
    const fetchRoles = async () => {
      try {
        const res = await fetch("/api/roles")
        const data = await res.json()

        if (!res.ok) {
          setError(data.error || "Failed to fetch roles")
        } else {
          setRoles(data.roles || [])
        }
      } catch (err) {
        setError("Failed to fetch roles")
      } finally {
        setLoading(false)
      }
    }

    fetchRoles()
  }, [])

  const handleAddRole = () => {
    setSelectedRole(null)
    setIsFormOpen(true)
  }

  const handleEditRole = (role: Role) => {
    setSelectedRole(role)
    setIsFormOpen(true)
  }

  const handleDeleteRole = (role: Role) => {
    setSelectedRole(role)
    setIsDeleteOpen(true)
  }

  const confirmDelete = async () => {
    if (!selectedRole) return

    try {
      const res = await fetch(`/api/roles/${selectedRole.id}`, {
        method: "DELETE",
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || "Failed to delete role")
      } else {
        // Update local state
        setRoles(roles.filter((r) => r.id !== selectedRole.id))
      }
    } catch (err) {
      setError("Failed to delete role")
    }
  }

  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), "MMM d, yyyy")
    } catch (e) {
      return "Invalid date"
    }
  }

  const columns = [
    {
      key: "name",
      header: "Name",
      render: (role: Role) => (
        <div className="flex items-center gap-2">
          {role.name}
          {role.is_system && (
            <Badge variant="secondary" className="text-xs">
              System
            </Badge>
          )}
        </div>
      ),
    },
    { key: "description", header: "Description" },
    {
      key: "created_at",
      header: "Created At",
      render: (role: Role) => formatDate(role.created_at),
    },
  ]

  if (loading) {
    return <div className="flex justify-center p-8">Loading roles...</div>
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Role Management</h2>
        <Button onClick={handleAddRole}>
          <Plus className="mr-2 h-4 w-4" />
          Add Role
        </Button>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <DataTable
        data={roles}
        columns={columns}
        onEdit={handleEditRole}
        onDelete={(role) => (role.is_system ? null : handleDeleteRole(role))}
      />

      <RoleForm isOpen={isFormOpen} onClose={() => setIsFormOpen(false)} role={selectedRole || undefined} />

      <DeleteConfirmation
        isOpen={isDeleteOpen}
        onClose={() => setIsDeleteOpen(false)}
        onConfirm={confirmDelete}
        title="Delete Role"
        description={`Are you sure you want to delete the role "${selectedRole?.name}"? This action cannot be undone.`}
      />
    </div>
  )
}
