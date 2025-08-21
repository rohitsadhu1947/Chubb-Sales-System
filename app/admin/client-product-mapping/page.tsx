"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { DataTable } from "@/components/ui/data-table"
import { ClientProductMapForm } from "@/components/admin/client-product-map-form"
import { DeleteConfirmation } from "@/components/admin/delete-confirmation"
import { Plus } from "lucide-react"
import {
  getClientProductMappings,
  deleteClientProductMapping,
  getClients,
  getProducts,
  getBrokers,
  getSalesLeads,
} from "@/lib/actions"
import type { ClientProductMap, Client, Product, Broker, SalesLead } from "@/lib/db"
import { useRouter } from "next/navigation"
import { format } from "date-fns"

export default function ClientProductMappingPage() {
  const router = useRouter()
  const [mappings, setMappings] = useState<ClientProductMap[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [brokers, setBrokers] = useState<Broker[]>([])
  const [salesLeads, setSalesLeads] = useState<SalesLead[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [isDeleteOpen, setIsDeleteOpen] = useState(false)
  const [selectedMapping, setSelectedMapping] = useState<ClientProductMap | null>(null)

  // Fetch data on component mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch all required data in parallel
        const [mappingsResult, clientsResult, productsResult, brokersResult, salesLeadsResult] = await Promise.all([
          getClientProductMappings(),
          getClients(),
          getProducts(),
          getBrokers(),
          getSalesLeads(),
        ])

        if (mappingsResult.error) setError(mappingsResult.error)
        else setMappings(mappingsResult.mappings || [])

        if (clientsResult.error) setError(clientsResult.error)
        else setClients(clientsResult.clients || [])

        if (productsResult.error) setError(productsResult.error)
        else setProducts(productsResult.products || [])

        if (brokersResult.error) setError(brokersResult.error)
        else setBrokers(brokersResult.brokers || [])

        if (salesLeadsResult.error) setError(salesLeadsResult.error)
        else setSalesLeads(salesLeadsResult.salesLeads || [])
      } catch (err) {
        setError("Failed to fetch data")
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  const handleAddMapping = () => {
    setSelectedMapping(null)
    setIsFormOpen(true)
  }

  const handleEditMapping = (mapping: ClientProductMap) => {
    setSelectedMapping(mapping)
    setIsFormOpen(true)
  }

  const handleDeleteMapping = (mapping: ClientProductMap) => {
    setSelectedMapping(mapping)
    setIsDeleteOpen(true)
  }

  const confirmDelete = async () => {
    if (!selectedMapping) return

    try {
      const result = await deleteClientProductMapping(selectedMapping.id)
      if (result.error) {
        setError(result.error)
      } else {
        // Refresh the mapping list
        router.refresh()

        // Update the local state to remove the deleted mapping
        setMappings(mappings.filter((m) => m.id !== selectedMapping.id))
      }
    } catch (err) {
      setError("Failed to delete mapping")
    }
  }

  const columns = [
    {
      key: "client_name",
      header: "Client",
    },
    {
      key: "product_name",
      header: "Product",
    },
    {
      key: "broker_name",
      header: "Broker",
    },
    {
      key: "sales_lead_name",
      header: "Sales Lead",
    },
    {
      key: "channel_type",
      header: "Channel Type",
    },
    {
      key: "start_date",
      header: "Start Date",
      render: (mapping: ClientProductMap) => {
        return format(new Date(mapping.start_date), "MMM d, yyyy")
      },
    },
  ]

  if (loading) {
    return <div className="flex justify-center p-8">Loading data...</div>
  }

  if (error) {
    return <div className="text-destructive p-8">{error}</div>
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Client Product Mapping</h2>
        <Button onClick={handleAddMapping}>
          <Plus className="mr-2 h-4 w-4" />
          Add Mapping
        </Button>
      </div>

      <DataTable data={mappings} columns={columns} onEdit={handleEditMapping} onDelete={handleDeleteMapping} />

      {isFormOpen && (
        <ClientProductMapForm
          isOpen={isFormOpen}
          onClose={() => setIsFormOpen(false)}
          mapping={selectedMapping || undefined}
          clients={clients}
          products={products}
          brokers={brokers}
          salesLeads={salesLeads}
        />
      )}

      <DeleteConfirmation
        isOpen={isDeleteOpen}
        onClose={() => setIsDeleteOpen(false)}
        onConfirm={confirmDelete}
        title="Delete Mapping"
        description={`Are you sure you want to delete this mapping? This action cannot be undone.`}
      />
    </div>
  )
}
