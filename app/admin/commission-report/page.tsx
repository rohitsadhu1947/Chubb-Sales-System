"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Skeleton } from "@/components/ui/skeleton"
import { AlertCircle, Download, RefreshCw } from "lucide-react"
import { getCommissionReportData, getClients, getProducts, getBrokers } from "@/lib/actions"
import { convertToCSV, downloadCSV } from "@/lib/csv-export"
import { ExpandableRow } from "@/components/commission-report/expandable-row"
import type { Client, Product, Broker } from "@/lib/db"

// Define filter types
type FilterState = {
  dateRange: {
    from: Date | undefined
    to: Date | undefined
  }
  clientId: string
  productId: string
  brokerId: string
  channelType: string
}

// Helper function to format date to YYYY-MM-DD
function formatDate(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

// Helper function to subtract months
function subMonths(date: Date, months: number): Date {
  const result = new Date(date)
  result.setMonth(result.getMonth() - months)
  return result
}

export default function CommissionReportPage() {
  // State for filter options
  const [clients, setClients] = useState<Client[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [brokers, setBrokers] = useState<Broker[]>([])

  // State for loading and errors
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)

  // State for filter values
  const [filters, setFilters] = useState<FilterState>({
    dateRange: {
      from: subMonths(new Date(), 3),
      to: new Date(),
    },
    clientId: "all",
    productId: "all",
    brokerId: "all",
    channelType: "all",
  })

  // State for report data
  const [reportData, setReportData] = useState<any[]>([])

  // Fetch filter options on component mount
  useEffect(() => {
    const fetchFilterOptions = async () => {
      try {
        const [clientsResult, productsResult, brokersResult] = await Promise.all([
          getClients(),
          getProducts(),
          getBrokers(),
        ])

        if (clientsResult.error) setError(clientsResult.error)
        else setClients(clientsResult.clients || [])

        if (productsResult.error) setError(productsResult.error)
        else setProducts(productsResult.products || [])

        if (brokersResult.error) setError(brokersResult.error)
        else setBrokers(brokersResult.brokers || [])
      } catch (err) {
        setError("Failed to fetch filter options")
      }
    }

    fetchFilterOptions()
  }, [])

  // Fetch report data based on filters
  useEffect(() => {
    const fetchReportData = async () => {
      setLoading(true)
      setError(null)
      try {
        const { from, to } = filters.dateRange
        if (!from || !to) {
          setError("Invalid date range")
          setLoading(false)
          return
        }

        const fromDate = formatDate(from)
        const toDate = formatDate(to)

        console.log("Fetching commission report data with filters:", {
          fromDate,
          toDate,
          clientId: filters.clientId,
          productId: filters.productId,
          brokerId: filters.brokerId,
          channelType: filters.channelType,
        })

        const result = await getCommissionReportData({
          fromDate,
          toDate,
          clientId: filters.clientId,
          productId: filters.productId,
          brokerId: filters.brokerId,
          channelType: filters.channelType,
        })

        if (result.error) {
          setError(result.error)
        } else {
          setReportData(result.clients || [])
        }
      } catch (err) {
        console.error("Error in fetchReportData:", err)
        setError(`Failed to fetch report data: ${err instanceof Error ? err.message : String(err)}`)
      } finally {
        setLoading(false)
        setRefreshing(false)
      }
    }

    fetchReportData()
  }, [filters])

  // Handle date range change
  const handleDateRangeChange = (range: { from: Date | undefined; to: Date | undefined }) => {
    setFilters({
      ...filters,
      dateRange: range,
    })
  }

  // Handle refresh button click
  const handleRefresh = () => {
    setRefreshing(true)
    // The useEffect will handle the data fetching
  }

  // Format currency
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 2,
    }).format(value)
  }

  // Format percentage
  const formatPercent = (value: number) => {
    return new Intl.NumberFormat("en", {
      style: "percent",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value / 100)
  }

  // Handle CSV download
  const handleDownloadCSV = () => {
    // Prepare data for CSV
    const flatData: any[] = []

    reportData.forEach((client) => {
      // Add client summary row
      flatData.push({
        client_name: client.name,
        product_name: "All Products",
        broker_name: "All Brokers",
        channel_type: "All Channels",
        gwp_inr: client.totalGwpInr,
        commission_pct: client.avgCommissionPct,
        commission_inr: client.totalCommissionInr,
        cdp_fee_pct: client.avgCdpFeePct,
        cdp_fee_inr: client.totalCdpFeeInr,
      })

      // Add detail rows
      client.details.forEach((detail) => {
        flatData.push({
          client_name: client.name,
          product_name: detail.productName,
          broker_name: detail.brokerName,
          channel_type: detail.channelType,
          gwp_inr: detail.gwpInr,
          commission_pct: detail.commissionPct,
          commission_inr: detail.commissionInr,
          cdp_fee_pct: detail.cdpFeePct,
          cdp_fee_inr: detail.cdpFeeInr,
        })
      })
    })

    // Define CSV headers
    const headers = [
      { key: "client_name", label: "Client" },
      { key: "product_name", label: "Product" },
      { key: "broker_name", label: "Broker" },
      { key: "channel_type", label: "Channel" },
      { key: "gwp_inr", label: "GWP (INR)" },
      { key: "commission_pct", label: "Commission %" },
      { key: "commission_inr", label: "Commission (INR)" },
      { key: "cdp_fee_pct", label: "CDP Fee %" },
      { key: "cdp_fee_inr", label: "CDP Fee (INR)" },
    ]

    // Generate CSV content
    const csvContent = convertToCSV(flatData, headers)

    // Generate filename with current date
    const dateStr = formatDate(new Date())
    const fileName = `commission-report-${dateStr}.csv`

    // Download CSV
    downloadCSV(csvContent, fileName)
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Commission Report</h2>
        <div className="flex gap-2">
          <Button onClick={handleRefresh} disabled={refreshing || loading} size="sm">
            <RefreshCw className={`mr-2 h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Button onClick={handleDownloadCSV} disabled={loading || reportData.length === 0} size="sm">
            <Download className="mr-2 h-4 w-4" />
            Download CSV
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
          <div className="space-y-2">
            <label className="text-sm font-medium">Date Range</label>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs text-muted-foreground">From</label>
                <input
                  type="date"
                  className="w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
                  value={filters.dateRange.from ? formatDate(filters.dateRange.from) : ""}
                  onChange={(e) => {
                    const newDate = e.target.value ? new Date(e.target.value) : undefined
                    setFilters({
                      ...filters,
                      dateRange: { ...filters.dateRange, from: newDate },
                    })
                  }}
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">To</label>
                <input
                  type="date"
                  className="w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
                  value={filters.dateRange.to ? formatDate(filters.dateRange.to) : ""}
                  onChange={(e) => {
                    const newDate = e.target.value ? new Date(e.target.value) : undefined
                    setFilters({
                      ...filters,
                      dateRange: { ...filters.dateRange, to: newDate },
                    })
                  }}
                />
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Client</label>
            <Select value={filters.clientId} onValueChange={(value) => setFilters({ ...filters, clientId: value })}>
              <SelectTrigger>
                <SelectValue placeholder="All Clients" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Clients</SelectItem>
                {clients.map((client) => (
                  <SelectItem key={client.id} value={client.id}>
                    {client.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Product</label>
            <Select value={filters.productId} onValueChange={(value) => setFilters({ ...filters, productId: value })}>
              <SelectTrigger>
                <SelectValue placeholder="All Products" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Products</SelectItem>
                {products.map((product) => (
                  <SelectItem key={product.id} value={product.id}>
                    {product.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Broker</label>
            <Select value={filters.brokerId} onValueChange={(value) => setFilters({ ...filters, brokerId: value })}>
              <SelectTrigger>
                <SelectValue placeholder="All Brokers" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Brokers</SelectItem>
                {brokers.map((broker) => (
                  <SelectItem key={broker.id} value={broker.id}>
                    {broker.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Channel Type</label>
            <Select
              value={filters.channelType}
              onValueChange={(value) => setFilters({ ...filters, channelType: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="All Channels" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Channels</SelectItem>
                <SelectItem value="Online">Online</SelectItem>
                <SelectItem value="Phygital">Phygital</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </Card>

      {/* Error Alert */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Report Table */}
      <Card>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Client</TableHead>
                <TableHead>Product</TableHead>
                <TableHead>Broker</TableHead>
                <TableHead>Channel</TableHead>
                <TableHead className="text-right">GWP (INR)</TableHead>
                <TableHead className="text-right">Commission %</TableHead>
                <TableHead className="text-right">Commission (INR)</TableHead>
                <TableHead className="text-right">CDP Fee %</TableHead>
                <TableHead className="text-right">CDP Fee (INR)</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={9}>
                    <div className="space-y-2">
                      <Skeleton className="h-10 w-full" />
                      <Skeleton className="h-10 w-full" />
                      <Skeleton className="h-10 w-full" />
                    </div>
                  </TableCell>
                </TableRow>
              ) : reportData.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="h-24 text-center">
                    No results found.
                  </TableCell>
                </TableRow>
              ) : (
                reportData.map((client) => (
                  <ExpandableRow
                    key={client.id}
                    client={client}
                    formatCurrency={formatCurrency}
                    formatPercent={formatPercent}
                  />
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  )
}
