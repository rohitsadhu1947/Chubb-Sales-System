"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { AlertCircle } from "lucide-react"
import { getMonthlyTrendsData, getClients, getProducts, getBrokers } from "@/lib/actions"
import type { Client, Product, Broker } from "@/lib/db"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js"
import { Line, Bar } from "react-chartjs-2"

// Register ChartJS components
ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, Title, Tooltip, Legend)

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

// Helper function to format date for display
function formatDateForDisplay(date: Date): string {
  const options: Intl.DateTimeFormatOptions = {
    year: "numeric",
    month: "short",
    day: "numeric",
  }
  return new Intl.DateTimeFormat("en-US", options).format(date)
}

export function MonthlyTrends() {
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
      from: subMonths(new Date(), 6),
      to: new Date(),
    },
    clientId: "all",
    productId: "all",
    brokerId: "all",
    channelType: "all",
  })

  // State for chart data
  const [gwpLineData, setGwpLineData] = useState<any>({ labels: [], datasets: [] })
  const [commissionVsFeeData, setCommissionVsFeeData] = useState<any>({ labels: [], datasets: [] })

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

  // Fetch monthly trends data based on filters
  useEffect(() => {
    const fetchMonthlyTrendsData = async () => {
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

        console.log("Fetching monthly trends data with filters:", {
          fromDate,
          toDate,
          clientId: filters.clientId,
          productId: filters.productId,
          brokerId: filters.brokerId,
          channelType: filters.channelType,
        })

        const result = await getMonthlyTrendsData({
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
          setGwpLineData(result.gwpLineData)
          setCommissionVsFeeData(result.commissionVsFeeData)
        }
      } catch (err) {
        console.error("Error in fetchMonthlyTrendsData:", err)
        setError(`Failed to fetch monthly trends data: ${err instanceof Error ? err.message : String(err)}`)
      } finally {
        setLoading(false)
        setRefreshing(false)
      }
    }

    fetchMonthlyTrendsData()
  }, [filters])

  // Handle date range change
  const handleDateRangeChange = (range: { from: Date | undefined; to: Date | undefined }) => {
    setFilters({
      ...filters,
      dateRange: range,
    })
  }

  // Chart options
  const lineChartOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: "top" as const,
      },
      title: {
        display: true,
        text: "Monthly GWP per Product per Partner",
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        title: {
          display: true,
          text: "GWP (INR)",
        },
      },
    },
  }

  const barChartOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: "top" as const,
      },
      title: {
        display: true,
        text: "Monthly Commission vs CDP Fee",
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        title: {
          display: true,
          text: "Amount (INR)",
        },
      },
    },
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
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
          <Select value={filters.channelType} onValueChange={(value) => setFilters({ ...filters, channelType: value })}>
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

      {/* Charts */}
      <div className="grid gap-4 md:grid-cols-1 lg:grid-cols-2">
        {/* GWP Line Chart */}
        <Card className="col-span-1 lg:col-span-2">
          <CardHeader>
            <CardTitle>Monthly GWP Trends</CardTitle>
            <CardDescription>GWP per product per partner over time</CardDescription>
          </CardHeader>
          <CardContent className="h-[400px]">
            {loading ? (
              <div className="flex items-center justify-center h-full">
                <Skeleton className="h-full w-full" />
              </div>
            ) : gwpLineData.datasets.length > 0 ? (
              <Line options={lineChartOptions} data={gwpLineData} />
            ) : (
              <div className="flex items-center justify-center h-full text-muted-foreground">
                No data available for the selected filters
              </div>
            )}
          </CardContent>
        </Card>

        {/* Commission vs Fee Bar Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Commission vs CDP Fee</CardTitle>
            <CardDescription>Monthly comparison of broker commission and CDP fees</CardDescription>
          </CardHeader>
          <CardContent className="h-[400px]">
            {loading ? (
              <div className="flex items-center justify-center h-full">
                <Skeleton className="h-full w-full" />
              </div>
            ) : commissionVsFeeData.datasets[0].data.length > 0 ? (
              <Bar options={barChartOptions} data={commissionVsFeeData} />
            ) : (
              <div className="flex items-center justify-center h-full text-muted-foreground">
                No data available for the selected filters
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
