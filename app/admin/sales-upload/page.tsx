"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { DataTable } from "@/components/ui/data-table"
import { SalesDataForm } from "@/components/admin/sales-data-form"
import { DeleteConfirmation } from "@/components/admin/delete-confirmation"
import { Plus } from "lucide-react"
import { getSalesData, deleteSalesData, getClients, getProducts, getBrokers } from "@/lib/actions"
import type { SalesData, Client, Product, Broker } from "@/lib/db"
import { useRouter } from "next/navigation"
import { format } from "date-fns"

export default function SalesUploadPage() {
  const router = useRouter()
  const [salesData, setSalesData] = useState<SalesData[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [brokers, setBrokers] = useState<Broker[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [isDeleteOpen, setIsDeleteOpen] = useState(false)
  const [selectedSalesData, setSelectedSalesData] = useState<SalesData | null>(null)

  // Fetch data on component mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch all required data in parallel
        const [salesDataResult, clientsResult, productsResult, brokersResult] = await Promise.all([
          getSalesData(),
          getClients(),
          getProducts(),
          getBrokers(),
        ])

        if (salesDataResult.error) setError(salesDataResult.error)
        else setSalesData(salesDataResult.salesData || [])

        if (clientsResult.error) setError(clientsResult.error)
        else setClients(clientsResult.clients || [])

        if (productsResult.error) setError(productsResult.error)
        else setProducts(productsResult.products || [])

        if (brokersResult.error) setError(brokersResult.error)
        else setBrokers(brokersResult.brokers || [])
      } catch (err) {
        setError("Failed to fetch data")
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  const handleAddSalesData = () => {
    setSelectedSalesData(null)
    setIsFormOpen(true)
  }

  const handleEditSalesData = (data: SalesData) => {
    setSelectedSalesData(data)
    setIsFormOpen(true)
  }

  const handleDeleteSalesData = (data: SalesData) => {
    setSelectedSalesData(data)
    setIsDeleteOpen(true)
  }

  const confirmDelete = async () => {
    if (!selectedSalesData) return

    try {
      const result = await deleteSalesData(selectedSalesData.id)
      if (result.error) {
        setError(result.error)
      } else {
        // Refresh the sales data list
        router.refresh()

        // Update the local state to remove the deleted sales data
        setSalesData(salesData.filter((s) => s.id !== selectedSalesData.id))
      }
    } catch (err) {
      setError("Failed to delete sales data")
    }
  }

  const formatCurrency = (value: any) => {
    if (value == null) return "N/A"
    const numValue = Number(value)
    if (isNaN(numValue)) return "Invalid"

    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 2,
    }).format(numValue)
  }

  const formatUSD = (value: any) => {
    if (value == null) return "N/A"
    const numValue = Number(value)
    if (isNaN(numValue)) return "Invalid"

    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 2,
    }).format(numValue)
  }

  const formatPercent = (value: any) => {
    if (value == null) return "N/A"
    const numValue = Number(value)
    if (isNaN(numValue)) return "Invalid %"

    return `${numValue.toFixed(2)}%`
  }

  const columns = [
    {
      key: "sale_date",
      header: "Sale Date",
      render: (data: SalesData) => {
        try {
          return data.sale_date ? format(new Date(data.sale_date), "MMM d, yyyy") : "N/A"
        } catch (e) {
          return "Invalid Date"
        }
      },
    },
    {
      key: "client_name",
      header: "Client",
      render: (data: SalesData) => data.client_name || "N/A",
    },
    {
      key: "product_name",
      header: "Product",
      render: (data: SalesData) => data.product_name || "N/A",
    },
    {
      key: "broker_name",
      header: "Broker",
      render: (data: SalesData) => data.broker_name || "N/A",
    },
    {
      key: "channel_type",
      header: "Channel",
      render: (data: SalesData) => data.channel_type || "N/A",
    },
    {
      key: "nbp_inr",
      header: "NBP (INR)",
      render: (data: SalesData) => formatCurrency(data.nbp_inr),
    },
    {
      key: "gwp_inr",
      header: "GWP (INR)",
      render: (data: SalesData) => formatCurrency(data.gwp_inr),
    },
    {
      key: "broker_commission_pct",
      header: "Broker Comm %",
      render: (data: SalesData) => formatPercent(data.broker_commission_pct),
    },
    {
      key: "cdp_fee_pct",
      header: "CDP Fee %",
      render: (data: SalesData) => formatPercent(data.cdp_fee_pct),
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
        <h2 className="text-2xl font-bold">Sales Upload</h2>
        <Button onClick={handleAddSalesData}>
          <Plus className="mr-2 h-4 w-4" />
          Add Sales Data
        </Button>
      </div>

      <DataTable data={salesData} columns={columns} onEdit={handleEditSalesData} onDelete={handleDeleteSalesData} />

      {isFormOpen && (
        <SalesDataForm
          isOpen={isFormOpen}
          onClose={() => setIsFormOpen(false)}
          salesData={selectedSalesData || undefined}
          clients={clients}
          products={products}
          brokers={brokers}
        />
      )}

      <DeleteConfirmation
        isOpen={isDeleteOpen}
        onClose={() => setIsDeleteOpen(false)}
        onConfirm={confirmDelete}
        title="Delete Sales Data"
        description={`Are you sure you want to delete this sales record? This action cannot be undone.`}
      />
    </div>
  )
}
