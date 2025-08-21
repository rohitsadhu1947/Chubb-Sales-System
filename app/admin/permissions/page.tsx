"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Checkbox } from "@/components/ui/checkbox"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { AlertCircle, Database } from "lucide-react"
import { useAuth } from "@/components/auth-provider"
import { grantPermission, revokePermission } from "@/lib/permissions"
import type { Permission } from "@/lib/permissions"

export default function PermissionsPage() {
  const { user } = useAuth()
  const [users, setUsers] = useState<any[]>([])
  const [modules, setModules] = useState<any[]>([])
  const [selectedUser, setSelectedUser] = useState<string>("")
  const [userPermissions, setUserPermissions] = useState<Permission[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [creatingTables, setCreatingTables] = useState(false)

  // Fetch users and modules
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      try {
        const [usersResult, modulesResult] = await Promise.all([
          fetch("/api/users").then((res) => res.json()),
          fetch("/api/modules").then((res) => res.json()),
        ])

        if (usersResult.error) setError(usersResult.error)
        else setUsers(usersResult.users || [])

        if (modulesResult.error) setError(modulesResult.error)
        else setModules(modulesResult.modules || [])
      } catch (err) {
        setError("Failed to fetch data")
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  // Fetch user permissions when a user is selected
  useEffect(() => {
    if (!selectedUser) {
      setUserPermissions([])
      return
    }

    const fetchUserPermissions = async () => {
      setLoading(true)
      try {
        const res = await fetch(`/api/users/${selectedUser}/permissions`)
        const data = await res.json()

        if (data.error) {
          setError(data.error)
        } else {
          setUserPermissions(data.permissions || [])
        }
      } catch (err) {
        setError("Failed to fetch user permissions")
      } finally {
        setLoading(false)
      }
    }

    fetchUserPermissions()
  }, [selectedUser])

  // Handle permission change
  const handlePermissionChange = async (permission: Permission, checked: boolean) => {
    if (!selectedUser || !user?.id) return

    setSaving(true)
    setError(null)
    setSuccess(null)

    try {
      const action = checked ? grantPermission : revokePermission
      const result = await action(selectedUser, permission.id, user.id)

      if (result.error) {
        setError(result.error)
      } else {
        setSuccess(`Permission ${checked ? "granted" : "revoked"} successfully`)

        // Update local state
        setUserPermissions((prev) => prev.map((p) => (p.id === permission.id ? { ...p, granted: checked } : p)))
      }
    } catch (err) {
      setError(`Failed to ${checked ? "grant" : "revoke"} permission`)
    } finally {
      setSaving(false)
    }
  }

  // Handle creating permission tables
  const handleCreateTables = async () => {
    setCreatingTables(true)
    setError(null)
    setSuccess(null)

    try {
      const res = await fetch("/api/permissions/create-tables", {
        method: "POST",
      })

      const data = await res.json()

      if (data.error) {
        setError(data.error)
      } else {
        setSuccess(
          `Permission tables created successfully. Created ${data.counts.modules} modules, ${data.counts.permissions} permissions, and ${data.counts.userPermissions} user permissions.`,
        )

        // Refresh the page after a short delay
        setTimeout(() => {
          window.location.reload()
        }, 2000)
      }
    } catch (err) {
      setError("Failed to create permission tables")
    } finally {
      setCreatingTables(false)
    }
  }

  // Group permissions by module
  const permissionsByModule = userPermissions.reduce(
    (acc, permission) => {
      if (!acc[permission.moduleName]) {
        acc[permission.moduleName] = []
      }
      acc[permission.moduleName].push(permission)
      return acc
    },
    {} as Record<string, Permission[]>,
  )

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">User Permissions</h2>
        {user?.role === "admin" && (
          <Button onClick={handleCreateTables} disabled={creatingTables}>
            <Database className="mr-2 h-4 w-4" />
            {creatingTables ? "Creating Tables..." : "Create Permission Tables"}
          </Button>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Manage User Permissions</CardTitle>
          <CardDescription>Configure which modules and actions each user can access</CardDescription>
        </CardHeader>
        <CardContent>
          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {success && (
            <Alert className="mb-4 bg-green-50 border-green-200">
              <AlertDescription className="text-green-800">{success}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Select User</label>
              <Select value={selectedUser} onValueChange={setSelectedUser}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a user" />
                </SelectTrigger>
                <SelectContent>
                  {users.map((user) => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.email} ({user.role})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedUser && (
              <div className="border rounded-md">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Module</TableHead>
                      <TableHead>View</TableHead>
                      <TableHead>Edit</TableHead>
                      <TableHead>Delete</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {Object.entries(permissionsByModule).map(([moduleName, permissions]) => {
                      const viewPerm = permissions.find((p) => p.name === "view")
                      const editPerm = permissions.find((p) => p.name === "edit")
                      const deletePerm = permissions.find((p) => p.name === "delete")

                      return (
                        <TableRow key={moduleName}>
                          <TableCell className="font-medium">{moduleName}</TableCell>
                          <TableCell>
                            {viewPerm && (
                              <Checkbox
                                checked={viewPerm.granted}
                                onCheckedChange={(checked) => handlePermissionChange(viewPerm, checked === true)}
                                disabled={saving}
                              />
                            )}
                          </TableCell>
                          <TableCell>
                            {editPerm && (
                              <Checkbox
                                checked={editPerm.granted}
                                onCheckedChange={(checked) => handlePermissionChange(editPerm, checked === true)}
                                disabled={saving || (viewPerm && !viewPerm.granted)}
                              />
                            )}
                          </TableCell>
                          <TableCell>
                            {deletePerm && (
                              <Checkbox
                                checked={deletePerm.granted}
                                onCheckedChange={(checked) => handlePermissionChange(deletePerm, checked === true)}
                                disabled={saving || (viewPerm && !viewPerm.granted)}
                              />
                            )}
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
