"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { DataTable } from "@/components/ui/data-table"
import { UserForm } from "@/components/admin/user-form"
import { DeleteConfirmation } from "@/components/admin/delete-confirmation"
import { Plus } from "lucide-react"
import { getUsers, deleteUser } from "@/lib/auth-actions"
import type { User } from "@/lib/db"
import { useRouter } from "next/navigation"
import { format } from "date-fns"

export default function UsersPage() {
  const router = useRouter()
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [isDeleteOpen, setIsDeleteOpen] = useState(false)
  const [selectedUser, setSelectedUser] = useState<User | null>(null)

  // Fetch users on component mount
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const { users, error } = await getUsers()
        if (error) {
          setError(error)
        } else {
          setUsers(users || [])
        }
      } catch (err) {
        setError("Failed to fetch users")
      } finally {
        setLoading(false)
      }
    }

    fetchUsers()
  }, [])

  const handleAddUser = () => {
    setSelectedUser(null)
    setIsFormOpen(true)
  }

  const handleEditUser = (user: User) => {
    setSelectedUser(user)
    setIsFormOpen(true)
  }

  const handleDeleteUser = (user: User) => {
    setSelectedUser(user)
    setIsDeleteOpen(true)
  }

  const confirmDelete = async () => {
    if (!selectedUser) return

    try {
      const result = await deleteUser(selectedUser.id)
      if (result.error) {
        setError(result.error)
      } else {
        // Refresh the user list
        router.refresh()

        // Update local state
        setUsers(users.filter((u) => u.id !== selectedUser.id))
      }
    } catch (err) {
      setError("Failed to delete user")
    }
  }

  const formatDate = (dateString: string | undefined) => {
    if (!dateString) return "Never"
    try {
      return format(new Date(dateString), "MMM d, yyyy h:mm a")
    } catch (e) {
      return "Invalid date"
    }
  }

  const columns = [
    { key: "username", header: "Username" },
    { key: "full_name", header: "Full Name" },
    { key: "email", header: "Email" },
    { key: "role", header: "Role", render: (user: User) => capitalizeFirstLetter(user.role) },
    {
      key: "created_at",
      header: "Created At",
      render: (user: User) => formatDate(user.created_at),
    },
    {
      key: "last_login",
      header: "Last Login",
      render: (user: User) => formatDate(user.last_login),
    },
  ]

  const capitalizeFirstLetter = (string: string) => {
    return string.charAt(0).toUpperCase() + string.slice(1)
  }

  if (loading) {
    return <div className="flex justify-center p-8">Loading users...</div>
  }

  if (error) {
    return <div className="text-destructive p-8">{error}</div>
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">User Management</h2>
        <Button onClick={handleAddUser}>
          <Plus className="mr-2 h-4 w-4" />
          Add User
        </Button>
      </div>

      <DataTable data={users} columns={columns} onEdit={handleEditUser} onDelete={handleDeleteUser} />

      <UserForm isOpen={isFormOpen} onClose={() => setIsFormOpen(false)} user={selectedUser || undefined} />

      <DeleteConfirmation
        isOpen={isDeleteOpen}
        onClose={() => setIsDeleteOpen(false)}
        onConfirm={confirmDelete}
        title="Delete User"
        description={`Are you sure you want to delete ${selectedUser?.username}? This action cannot be undone.`}
      />
    </div>
  )
}
