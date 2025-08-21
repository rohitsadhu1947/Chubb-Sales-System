"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { createSalesData, updateSalesData, getProductDetails, getLatestExchangeRate } from "@/lib/actions"
import { CalendarIcon } from "lucide-react"
import { format } from "date-fns"
import { cn } from "@/lib/utils"
import type { SalesData, Client, Product, Broker } from "@/lib/db"

interface SalesDataFormProps {
  isOpen: boolean
  onClose: () => void
  salesData?: SalesData
  clients: Client[]
  products: Product[]
  brokers: Broker[]
}

export function SalesDataForm({ isOpen, onClose, salesData, clients, products, brokers }: SalesDataFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [date, setDate] = useState<Date | undefined>(salesData ? new Date(salesData.sale_date) : new Date())

  // Form state
  const [selectedClientId, setSelectedClientId] = useState<string>(salesData?.client_id || "")
  const [selectedProductId, setSelectedProductId] = useState<string>(salesData?.product_id || "")
  const [selectedBrokerId, setSelectedBrokerId] = useState<string>(salesData?.broker_id || "")
  const [channelType, setChannelType] = useState<string>(salesData?.channel_type || "Online")

  // Financial values
  const [nbpInr, setNbpInr] = useState<number>(salesData?.nbp_inr || 0)
  const [gwpInr, setGwpInr] = useState<number>(salesData?.gwp_inr || 0)
  const [nbpUsd, setNbpUsd] = useState<number>(salesData?.nbp_usd || 0)
  const [gwpUsd, setGwpUsd] = useState<number>(salesData?.gwp_usd || 0)
  const [brokerCommissionPct, setBrokerCommissionPct] = useState<number>(salesData?.broker_commission_pct || 0)
  const [brokerCommissionInr, setBrokerCommissionInr] = useState<number>(salesData?.broker_commission_inr || 0)
  const [cdpFeePct, setCdpFeePct] = useState<number>(salesData?.cdp_fee_pct || 0)
  const [cdpFeeInr, setCdpFeeInr] = useState<number>(salesData?.cdp_fee_inr || 0)

  // Exchange rate
  const [exchangeRate, setExchangeRate] = useState<number>(83.5) // Default INR to USD rate

  // Fetch exchange rate on component mount
  useEffect(() => {
    const fetchExchangeRate = async () => {
      const { rate, error } = await getLatestExchangeRate()
      if (error) {
        console.error("Error fetching exchange rate:", error)
      } else if (rate) {
        setExchangeRate(rate.rate)
      }
    }

    fetchExchangeRate()
  }, [])

  // Update USD values when INR values or exchange rate changes
  useEffect(() => {
    if (exchangeRate > 0) {
      setNbpUsd(Number((nbpInr / exchangeRate).toFixed(2)))
      setGwpUsd(Number((gwpInr / exchangeRate).toFixed(2)))
    }
  }, [nbpInr, gwpInr, exchangeRate])

  // Update commission and fee when percentages or GWP changes
  useEffect(() => {
    setBrokerCommissionInr(Number(((gwpInr * brokerCommissionPct) / 100).toFixed(2)))
    setCdpFeeInr(Number(((gwpInr * cdpFeePct) / 100).toFixed(2)))
  }, [gwpInr, brokerCommissionPct, cdpFeePct])

  // Fetch product details when product is selected
  useEffect(() => {
    if (selectedProductId) {
      const fetchProductDetails = async () => {
        const { product, error } = await getProductDetails(selectedProductId)
        if (error) {
          console.error("Error fetching product details:", error)
        } else if (product) {
          setBrokerCommissionPct(product.base_commission_pct)
          setCdpFeePct(product.cdp_fee_pct)
        }
      }

      fetchProductDetails()
    }
  }, [selectedProductId])

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsSubmitting(true)
    setError(null)

    const formData = new FormData(e.currentTarget)

    // Add calculated fields to form data
    formData.set("nbp_usd", nbpUsd.toString())
    formData.set("gwp_usd", gwpUsd.toString())
    formData.set("broker_commission_inr", brokerCommissionInr.toString())
    formData.set("cdp_fee_inr", cdpFeeInr.toString())

    // Format the date to YYYY-MM-DD
    if (date) {
      formData.set("sale_date", format(date, "yyyy-MM-dd"))
    }

    try {
      if (salesData) {
        const result = await updateSalesData(salesData.id, formData)
        if (result.error) {
          setError(result.error)
        } else {
          onClose()
        }
      } else {
        const result = await createSalesData(formData)
        if (result.error) {
          setError(result.error)
        } else {
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
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>{salesData ? "Edit Sales Data" : "Add Sales Data"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="client_id">Client</Label>
                <Select name="client_id" value={selectedClientId} onValueChange={setSelectedClientId} required>
                  <SelectTrigger id="client_id">
                    <SelectValue placeholder="Select Client" />
                  </SelectTrigger>
                  <SelectContent>
                    {clients.map((client) => (
                      <SelectItem key={client.id} value={client.id}>
                        {client.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="product_id">Product</Label>
                <Select name="product_id" value={selectedProductId} onValueChange={setSelectedProductId} required>
                  <SelectTrigger id="product_id">
                    <SelectValue placeholder="Select Product" />
                  </SelectTrigger>
                  <SelectContent>
                    {products.map((product) => (
                      <SelectItem key={product.id} value={product.id}>
                        {product.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="broker_id">Broker</Label>
                <Select name="broker_id" value={selectedBrokerId} onValueChange={setSelectedBrokerId} required>
                  <SelectTrigger id="broker_id">
                    <SelectValue placeholder="Select Broker" />
                  </SelectTrigger>
                  <SelectContent>
                    {brokers.map((broker) => (
                      <SelectItem key={broker.id} value={broker.id}>
                        {broker.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="channel_type">Channel Type</Label>
                <Select name="channel_type" value={channelType} onValueChange={setChannelType} required>
                  <SelectTrigger id="channel_type">
                    <SelectValue placeholder="Select Channel Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Online">Online</SelectItem>
                    <SelectItem value="Phygital">Phygital</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="nbp_inr">NBP (INR)</Label>
                <Input
                  id="nbp_inr"
                  name="nbp_inr"
                  type="number"
                  step="0.01"
                  value={nbpInr}
                  onChange={(e) => setNbpInr(Number(e.target.value))}
                  required
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="gwp_inr">GWP (INR)</Label>
                <Input
                  id="gwp_inr"
                  name="gwp_inr"
                  type="number"
                  step="0.01"
                  value={gwpInr}
                  onChange={(e) => setGwpInr(Number(e.target.value))}
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="nbp_usd">NBP (USD) - Auto-calculated</Label>
                <Input id="nbp_usd" type="number" step="0.01" value={nbpUsd} readOnly className="bg-gray-100" />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="gwp_usd">GWP (USD) - Auto-calculated</Label>
                <Input id="gwp_usd" type="number" step="0.01" value={gwpUsd} readOnly className="bg-gray-100" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="broker_commission_pct">Broker Commission %</Label>
                <Input
                  id="broker_commission_pct"
                  name="broker_commission_pct"
                  type="number"
                  step="0.01"
                  value={brokerCommissionPct}
                  onChange={(e) => setBrokerCommissionPct(Number(e.target.value))}
                  required
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="broker_commission_inr">Broker Commission (INR) - Auto-calculated</Label>
                <Input
                  id="broker_commission_inr"
                  type="number"
                  step="0.01"
                  value={brokerCommissionInr}
                  readOnly
                  className="bg-gray-100"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="cdp_fee_pct">CDP Fee %</Label>
                <Input
                  id="cdp_fee_pct"
                  name="cdp_fee_pct"
                  type="number"
                  step="0.01"
                  value={cdpFeePct}
                  onChange={(e) => setCdpFeePct(Number(e.target.value))}
                  required
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="cdp_fee_inr">CDP Fee (INR) - Auto-calculated</Label>
                <Input id="cdp_fee_inr" type="number" step="0.01" value={cdpFeeInr} readOnly className="bg-gray-100" />
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="sale_date">Sale Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    id="sale_date"
                    variant={"outline"}
                    className={cn("w-full justify-start text-left font-normal", !date && "text-muted-foreground")}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {date ? format(date, "PPP") : <span>Pick a date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar mode="single" selected={date} onSelect={setDate} initialFocus />
                </PopoverContent>
              </Popover>
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
