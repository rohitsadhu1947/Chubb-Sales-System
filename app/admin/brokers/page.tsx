"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { DataTable } from "@/components/ui/data-table"
import { BrokerForm } from "@/components/admin/broker-form"
import { DeleteConfirmation } from "@/components/admin/delete-confirmation"
import { Plus } from "lucide-react"
import { getBrokers, deleteBroker } from "@/lib/actions"
import type { Broker } from "@/lib/db"
import { useRouter } from "next/navigation"

export default function BrokersPage() {
  const router = useRouter()
  const [brokers, setBrokers] = useState<Broker[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [isDeleteOpen, setIsDeleteOpen] = useState(false)
  const [selectedBroker, setSelectedBroker] = useState<Broker | null>(null)

  // Fetch brokers on component mount - FIXED: Changed useState to useEffect
  useEffect(() => {
    const fetchBrokers = async () => {
      try {
        const { brokers, error } = await getBrokers()
        if (error) {
          setError(error)
        } else {
          setBrokers(brokers || [])
        }
      } catch (err) {
        setError("Failed to fetch brokers")
      } finally {
        setLoading(false)
      }
    }

    fetchBrokers()
  }, [])

  const handleAddBroker = () => {
    setSelectedBroker(null)
    setIsFormOpen(true)
  }

  const handleEditBroker = (broker: Broker) => {
    setSelectedBroker(broker)
    setIsFormOpen(true)
  }

  const handleDeleteBroker = (broker: Broker) => {
    setSelectedBroker(broker)
    setIsDeleteOpen(true)
  }

  const confirmDelete = async () => {
    if (!selectedBroker) return

    try {
      const result = await deleteBroker(selectedBroker.id)
      if (result.error) {
        setError(result.error)
      } else {
        // Refresh the broker list
        router.refresh()

        // Update local state
        setBrokers(brokers.filter((b) => b.id !== selectedBroker.id))
      }
    } catch (err) {
      setError("Failed to delete broker")
    }
  }

  const columns = [
    { key: "name", header: "Name" },
    { key: "contact_email", header: "Contact Email" },
    { key: "partner_type", header: "Partner Type" },
  ]

  if (loading) {
    return <div className="flex justify-center p-8">Loading brokers...</div>
  }

  if (error) {
    return <div className="text-destructive p-8">{error}</div>
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Brokers</h2>
        <Button onClick={handleAddBroker}>
          <Plus className="mr-2 h-4 w-4" />
          Add Broker
        </Button>
      </div>

      <DataTable data={brokers} columns={columns} onEdit={handleEditBroker} onDelete={handleDeleteBroker} />

      <BrokerForm isOpen={isFormOpen} onClose={() => setIsFormOpen(false)} broker={selectedBroker || undefined} />

      <DeleteConfirmation
        isOpen={isDeleteOpen}
        onClose={() => setIsDeleteOpen(false)}
        onConfirm={confirmDelete}
        title="Delete Broker"
        description={`Are you sure you want to delete ${selectedBroker?.name}? This action cannot be undone.`}
      />
    </div>
  )
}
