"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { RefreshCw, AlertCircle } from "lucide-react"
import { getDashboardData, getClients, getProducts, getBrokers } from "@/lib/actions"
import type { Client, Product, Broker } from "@/lib/db"
import { Skeleton } from "@/components/ui/skeleton"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { MonthlyTrends } from "@/components/dashboard/monthly-trends"

// Define filter types
type DateRangeType = "daily" | "weekly" | "mtd" | "ytd" | "custom"
type FilterState = {
  dateRange: {
    from: Date | undefined
    to: Date | undefined
  }
  dateRangeType: DateRangeType
  clientId: string
  productId: string
  brokerId: string
  channelType: string
}

// Define summary data type
type SummaryData = {
  totalGwpInr: number
  totalNbpInr: number
  totalGwpUsd: number
  totalNbpUsd: number
  totalBrokerCommissionInr: number
  totalBrokerCommissionUsd: number
  totalCdpFeeInr: number
  totalCdpFeeUsd: number
  exchangeRate: number
}

// Helper function to format date to YYYY-MM-DD
function formatDate(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

// Helper function to get start of month
function startOfMonth(date: Date): Date {
  const result = new Date(date)
  result.setDate(1)
  return result
}

// Helper function to get start of year
function startOfYear(date: Date): Date {
  const result = new Date(date)
  result.setMonth(0, 1)
  return result
}

// Helper function to get start of week
function startOfWeek(date: Date): Date {
  const result = new Date(date)
  const day = result.getDay()
  const diff = result.getDate() - day + (day === 0 ? -6 : 1) // adjust when day is Sunday
  result.setDate(diff)
  return result
}

// Helper function to subtract days
function subDays(date: Date, days: number): Date {
  const result = new Date(date)
  result.setDate(result.getDate() - days)
  return result
}

export default function DashboardPage() {
  // State for active tab
  const [activeTab, setActiveTab] = useState("summary")

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
      from: subDays(new Date(), 30),
      to: new Date(),
    },
    dateRangeType: "mtd",
    clientId: "all",
    productId: "all",
    brokerId: "all",
    channelType: "all",
  })

  // State for summary data
  const [summaryData, setSummaryData] = useState<SummaryData>({
    totalGwpInr: 0,
    totalNbpInr: 0,
    totalGwpUsd: 0,
    totalNbpUsd: 0,
    totalBrokerCommissionInr: 0,
    totalBrokerCommissionUsd: 0,
    totalCdpFeeInr: 0,
    totalCdpFeeUsd: 0,
    exchangeRate: 83.5,
  })

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

  // Fetch dashboard data based on filters
  useEffect(() => {
    const fetchDashboardData = async () => {
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

        console.log("Fetching dashboard data with filters:", {
          fromDate,
          toDate,
          clientId: filters.clientId,
          productId: filters.productId,
          brokerId: filters.brokerId,
          channelType: filters.channelType,
        })

        const result = await getDashboardData({
          fromDate,
          toDate,
          clientId: filters.clientId,
          productId: filters.productId,
          brokerId: filters.brokerId,
          channelType: filters.channelType,
        })

        console.log("Dashboard data received:", result)

        if (result.error) {
          setError(result.error)
        } else {
          setSummaryData({
            totalGwpInr: result.totalGwpInr || 0,
            totalNbpInr: result.totalNbpInr || 0,
            totalGwpUsd: result.totalGwpUsd || 0,
            totalNbpUsd: result.totalNbpUsd || 0,
            totalBrokerCommissionInr: result.totalBrokerCommissionInr || 0,
            totalBrokerCommissionUsd: result.totalBrokerCommissionUsd || 0,
            totalCdpFeeInr: result.totalCdpFeeInr || 0,
            totalCdpFeeUsd: result.totalCdpFeeUsd || 0,
            exchangeRate: result.exchangeRate || 83.5,
          })
        }
      } catch (err) {
        console.error("Error in fetchDashboardData:", err)
        setError(`Failed to fetch dashboard data: ${err instanceof Error ? err.message : String(err)}`)
      } finally {
        setLoading(false)
        setRefreshing(false)
      }
    }

    if (activeTab === "summary") {
      fetchDashboardData()
    }
  }, [filters, activeTab])

  // Handle date range type change
  const handleDateRangeTypeChange = (type: DateRangeType) => {
    const today = new Date()
    let from: Date | undefined
    let to: Date | undefined = today

    switch (type) {
      case "daily":
        from = today
        break
      case "weekly":
        from = startOfWeek(today)
        break
      case "mtd":
        from = startOfMonth(today)
        break
      case "ytd":
        from = startOfYear(today)
        break
      case "custom":
        // Keep the current date range
        from = filters.dateRange.from
        to = filters.dateRange.to
        break
    }

    setFilters({
      ...filters,
      dateRangeType: type,
      dateRange: { from, to },
    })
  }

  // Handle date range change
  const handleDateRangeChange = (range: { from: Date | undefined; to: Date | undefined }) => {
    setFilters({
      ...filters,
      dateRange: range,
      dateRangeType: "custom",
    })
  }

  // Handle refresh button click
  const handleRefresh = () => {
    setRefreshing(true)
    // The useEffect will handle the data fetching
  }

  // Format currency
  const formatCurrency = (value: number, currency = "INR") => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency,
      maximumFractionDigits: 2,
    }).format(value)
  }

  // Format date for display
  function formatDateForDisplay(date: Date): string {
    const options: Intl.DateTimeFormatOptions = {
      year: "numeric",
      month: "short",
      day: "numeric",
    }
    return new Intl.DateTimeFormat("en-US", options).format(date)
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Sales Dashboard</h2>
        <Button onClick={handleRefresh} disabled={refreshing || loading} size="sm">
          <RefreshCw className={`mr-2 h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="summary">Summary</TabsTrigger>
          <TabsTrigger value="monthly">Monthly Trends</TabsTrigger>
        </TabsList>

        <TabsContent value="summary" className="space-y-4">
          {/* Filters */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
            <div className="space-y-2">
              <label className="text-sm font-medium">Date Range</label>
              <Tabs value={filters.dateRangeType} onValueChange={(v) => handleDateRangeTypeChange(v as DateRangeType)}>
                <TabsList className="grid w-full grid-cols-5">
                  <TabsTrigger value="daily">Daily</TabsTrigger>
                  <TabsTrigger value="weekly">Weekly</TabsTrigger>
                  <TabsTrigger value="mtd">MTD</TabsTrigger>
                  <TabsTrigger value="ytd">YTD</TabsTrigger>
                  <TabsTrigger value="custom">Custom</TabsTrigger>
                </TabsList>
              </Tabs>
              {filters.dateRangeType === "custom" && (
                <div className="pt-2">
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
              )}
              {filters.dateRangeType !== "custom" && (
                <div className="pt-2 text-sm text-muted-foreground">
                  {filters.dateRange.from && filters.dateRange.to ? (
                    <>
                      {formatDateForDisplay(filters.dateRange.from)} - {formatDateForDisplay(filters.dateRange.to)}
                    </>
                  ) : (
                    "Select a date range"
                  )}
                </div>
              )}
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

          {/* Error Alert */}
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Summary Cards */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {/* GWP Card */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Total GWP</CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="space-y-2">
                    <Skeleton className="h-6 w-full" />
                    <Skeleton className="h-6 w-2/3" />
                  </div>
                ) : (
                  <>
                    <div className="text-2xl font-bold">{formatCurrency(summaryData.totalGwpInr)}</div>
                    <p className="text-xs text-muted-foreground">{formatCurrency(summaryData.totalGwpUsd, "USD")}</p>
                  </>
                )}
              </CardContent>
            </Card>

            {/* NBP Card */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Total NBP</CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="space-y-2">
                    <Skeleton className="h-6 w-full" />
                    <Skeleton className="h-6 w-2/3" />
                  </div>
                ) : (
                  <>
                    <div className="text-2xl font-bold">{formatCurrency(summaryData.totalNbpInr)}</div>
                    <p className="text-xs text-muted-foreground">{formatCurrency(summaryData.totalNbpUsd, "USD")}</p>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Broker Commission Card */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Total Broker Commission</CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="space-y-2">
                    <Skeleton className="h-6 w-full" />
                    <Skeleton className="h-6 w-2/3" />
                  </div>
                ) : (
                  <>
                    <div className="text-2xl font-bold">{formatCurrency(summaryData.totalBrokerCommissionInr)}</div>
                    <p className="text-xs text-muted-foreground">
                      {formatCurrency(summaryData.totalBrokerCommissionUsd, "USD")}
                    </p>
                  </>
                )}
              </CardContent>
            </Card>

            {/* CDP Fee Card */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Total CDP Fee</CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="space-y-2">
                    <Skeleton className="h-6 w-full" />
                    <Skeleton className="h-6 w-2/3" />
                  </div>
                ) : (
                  <>
                    <div className="text-2xl font-bold">{formatCurrency(summaryData.totalCdpFeeInr)}</div>
                    <p className="text-xs text-muted-foreground">{formatCurrency(summaryData.totalCdpFeeUsd, "USD")}</p>
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="monthly">
          <MonthlyTrends />
        </TabsContent>
      </Tabs>
    </div>
  )
}
