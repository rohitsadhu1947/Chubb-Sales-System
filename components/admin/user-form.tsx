"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { createUser, updateUser } from "@/lib/auth-actions"
import type { User } from "@/lib/db"

interface Role {
  id: string
  name: string
}

interface UserFormProps {
  isOpen: boolean
  onClose: () => void
  user?: User
}

export function UserForm({ isOpen, onClose, user }: UserFormProps) {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [roles, setRoles] = useState<Role[]>([])
  const [loading, setLoading] = useState(true)

  // Fetch roles on component mount
  useEffect(() => {
    const fetchRoles = async () => {
      try {
        const res = await fetch("/api/roles")
        const data = await res.json()

        if (!res.ok) {
          console.error("Failed to fetch roles:", data.error)
        } else {
          setRoles(data.roles || [])
        }
      } catch (err) {
        console.error("Error fetching roles:", err)
      } finally {
        setLoading(false)
      }
    }

    if (isOpen) {
      fetchRoles()
    }
  }, [isOpen])

  // Modify the handleSubmit function to handle both role systems
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsSubmitting(true)
    setError(null)

    const formData = new FormData(e.currentTarget)

    // If no roles are available, add the role directly
    if (roles.length === 0) {
      const roleSelect = formData.get("role") as string
      if (roleSelect) {
        formData.set("role", roleSelect)
      }
    }

    try {
      if (user) {
        const result = await updateUser(user.id, formData)
        if (result.error) {
          setError(result.error)
        } else {
          router.refresh()
          onClose()
        }
      } else {
        const result = await createUser(formData)
        if (result.error) {
          setError(result.error)
        } else {
          router.refresh()
          onClose()
        }
      }
    } catch (err) {
      setError("An unexpected error occurred")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{user ? "Edit User" : "Add User"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            {!user && (
              <div className="grid gap-2">
                <Label htmlFor="username">Username</Label>
                <Input id="username" name="username" required />
              </div>
            )}

            <div className="grid gap-2">
              <Label htmlFor="full_name">Full Name</Label>
              <Input id="full_name" name="full_name" defaultValue={user?.full_name || ""} required />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" name="email" type="email" defaultValue={user?.email || ""} required />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="role_id">Role</Label>
              {loading ? (
                <div className="h-10 bg-muted animate-pulse rounded-md"></div>
              ) : roles.length > 0 ? (
                <Select name="role_id" defaultValue={user?.role_id || ""} required>
                  <SelectTrigger id="role_id">
                    <SelectValue placeholder="Select Role" />
                  </SelectTrigger>
                  <SelectContent>
                    {roles.map((role) => (
                      <SelectItem key={role.id} value={role.id}>
                        {role.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Select name="role" defaultValue={user?.role || "viewer"} required>
                  <SelectTrigger id="role">
                    <SelectValue placeholder="Select Role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="viewer">Viewer</SelectItem>
                    <SelectItem value="dataentry">Data Entry</SelectItem>
                  </SelectContent>
                </Select>
              )}
            </div>

            <div className="grid gap-2">
              <Label htmlFor="password">{user ? "New Password (leave blank to keep current)" : "Password"}</Label>
              <Input id="password" name="password" type="password" required={!user} />
            </div>
          </div>
          {error && <p className="text-sm text-destructive mb-4">{error}</p>}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
