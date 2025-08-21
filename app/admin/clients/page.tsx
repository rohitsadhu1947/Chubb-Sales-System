"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { DataTable } from "@/components/ui/data-table"
import { ClientForm } from "@/components/admin/client-form"
import { DeleteConfirmation } from "@/components/admin/delete-confirmation"
import { Plus } from "lucide-react"
import { getClients, deleteClient } from "@/lib/actions"
import type { Client } from "@/lib/db"
import { useRouter } from "next/navigation"
import { PermissionGuard } from "@/components/permission-guard"

export default function ClientsPage() {
  const router = useRouter()
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [isDeleteOpen, setIsDeleteOpen] = useState(false)
  const [selectedClient, setSelectedClient] = useState<Client | null>(null)

  // Fetch clients on component mount
  useEffect(() => {
    const fetchClients = async () => {
      try {
        const { clients, error } = await getClients()
        if (error) {
          setError(error)
        } else {
          setClients(clients || [])
        }
      } catch (err) {
        setError("Failed to fetch clients")
      } finally {
        setLoading(false)
      }
    }

    fetchClients()
  }, [])

  const handleAddClient = () => {
    setSelectedClient(null)
    setIsFormOpen(true)
  }

  const handleEditClient = (client: Client) => {
    setSelectedClient(client)
    setIsFormOpen(true)
  }

  const handleDeleteClient = (client: Client) => {
    setSelectedClient(client)
    setIsDeleteOpen(true)
  }

  const confirmDelete = async () => {
    if (!selectedClient) return

    try {
      const result = await deleteClient(selectedClient.id)
      if (result.error) {
        setError(result.error)
      } else {
        // Refresh the client list
        router.refresh()

        // Update local state
        setClients(clients.filter((c) => c.id !== selectedClient.id))
      }
    } catch (err) {
      setError("Failed to delete client")
    }
  }

  const columns = [
    { key: "name", header: "Name" },
    { key: "industry", header: "Industry" },
    { key: "region", header: "Region" },
    {
      key: "created_at",
      header: "Created At",
      render: (client: Client) => {
        const date = new Date(client.created_at)
        return date.toLocaleDateString()
      },
    },
  ]

  if (loading) {
    return <div className="flex justify-center p-8">Loading clients...</div>
  }

  if (error) {
    return <div className="text-destructive p-8">{error}</div>
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Clients</h2>
        <PermissionGuard moduleName="clients" permissionName="edit">
          <Button onClick={handleAddClient}>
            <Plus className="mr-2 h-4 w-4" />
            Add Client
          </Button>
        </PermissionGuard>
      </div>

      <DataTable
        data={clients}
        columns={columns}
        onEdit={(client) => (
          <PermissionGuard moduleName="clients" permissionName="edit">
            {handleEditClient(client)}
          </PermissionGuard>
        )}
        onDelete={(client) => (
          <PermissionGuard moduleName="clients" permissionName="delete">
            {handleDeleteClient(client)}
          </PermissionGuard>
        )}
      />

      <ClientForm isOpen={isFormOpen} onClose={() => setIsFormOpen(false)} client={selectedClient || undefined} />

      <DeleteConfirmation
        isOpen={isDeleteOpen}
        onClose={() => setIsDeleteOpen(false)}
        onConfirm={confirmDelete}
        title="Delete Client"
        description={`Are you sure you want to delete ${selectedClient?.name}? This action cannot be undone.`}
      />
    </div>
  )
}
