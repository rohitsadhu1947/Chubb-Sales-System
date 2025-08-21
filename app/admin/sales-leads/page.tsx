"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { DataTable } from "@/components/ui/data-table"
import { SalesLeadForm } from "@/components/admin/sales-lead-form"
import { DeleteConfirmation } from "@/components/admin/delete-confirmation"
import { Plus } from "lucide-react"
import { getSalesLeads, deleteSalesLead } from "@/lib/actions"
import type { SalesLead } from "@/lib/db"
import { useRouter } from "next/navigation"

export default function SalesLeadsPage() {
  const router = useRouter()
  const [salesLeads, setSalesLeads] = useState<SalesLead[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [isDeleteOpen, setIsDeleteOpen] = useState(false)
  const [selectedSalesLead, setSelectedSalesLead] = useState<SalesLead | null>(null)

  // Fetch sales leads on component mount - FIXED: Changed useState to useEffect
  useEffect(() => {
    const fetchSalesLeads = async () => {
      try {
        const { salesLeads, error } = await getSalesLeads()
        if (error) {
          setError(error)
        } else {
          setSalesLeads(salesLeads || [])
        }
      } catch (err) {
        setError("Failed to fetch sales leads")
      } finally {
        setLoading(false)
      }
    }

    fetchSalesLeads()
  }, [])

  const handleAddSalesLead = () => {
    setSelectedSalesLead(null)
    setIsFormOpen(true)
  }

  const handleEditSalesLead = (salesLead: SalesLead) => {
    setSelectedSalesLead(salesLead)
    setIsFormOpen(true)
  }

  const handleDeleteSalesLead = (salesLead: SalesLead) => {
    setSelectedSalesLead(salesLead)
    setIsDeleteOpen(true)
  }

  const confirmDelete = async () => {
    if (!selectedSalesLead) return

    try {
      const result = await deleteSalesLead(selectedSalesLead.id)
      if (result.error) {
        setError(result.error)
      } else {
        // Refresh the sales lead list
        router.refresh()

        // Update local state
        setSalesLeads(salesLeads.filter((sl) => sl.id !== selectedSalesLead.id))
      }
    } catch (err) {
      setError("Failed to delete sales lead")
    }
  }

  const columns = [
    { key: "name", header: "Name" },
    { key: "email", header: "Email" },
    { key: "phone", header: "Phone" },
  ]

  if (loading) {
    return <div className="flex justify-center p-8">Loading sales leads...</div>
  }

  if (error) {
    return <div className="text-destructive p-8">{error}</div>
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Sales Leads</h2>
        <Button onClick={handleAddSalesLead}>
          <Plus className="mr-2 h-4 w-4" />
          Add Sales Lead
        </Button>
      </div>

      <DataTable data={salesLeads} columns={columns} onEdit={handleEditSalesLead} onDelete={handleDeleteSalesLead} />

      <SalesLeadForm
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        salesLead={selectedSalesLead || undefined}
      />

      <DeleteConfirmation
        isOpen={isDeleteOpen}
        onClose={() => setIsDeleteOpen(false)}
        onConfirm={confirmDelete}
        title="Delete Sales Lead"
        description={`Are you sure you want to delete ${selectedSalesLead?.name}? This action cannot be undone.`}
      />
    </div>
  )
}
