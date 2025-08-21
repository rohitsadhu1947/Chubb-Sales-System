"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Label } from "@/components/ui/label"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { createClientProductMapping, updateClientProductMapping } from "@/lib/actions"
import { CalendarIcon } from "lucide-react"
import { format } from "date-fns"
import { cn } from "@/lib/utils"
import type { ClientProductMap, Client, Product, Broker, SalesLead } from "@/lib/db"

interface ClientProductMapFormProps {
  isOpen: boolean
  onClose: () => void
  mapping?: ClientProductMap
  clients: Client[]
  products: Product[]
  brokers: Broker[]
  salesLeads: SalesLead[]
}

export function ClientProductMapForm({
  isOpen,
  onClose,
  mapping,
  clients,
  products,
  brokers,
  salesLeads,
}: ClientProductMapFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [date, setDate] = useState<Date | undefined>(mapping ? new Date(mapping.start_date) : new Date())

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsSubmitting(true)
    setError(null)

    const formData = new FormData(e.currentTarget)

    // Format the date to YYYY-MM-DD
    if (date) {
      formData.set("start_date", format(date, "yyyy-MM-dd"))
    }

    try {
      if (mapping) {
        const result = await updateClientProductMapping(mapping.id, formData)
        if (result.error) {
          setError(result.error)
        } else {
          onClose()
        }
      } else {
        const result = await createClientProductMapping(formData)
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
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{mapping ? "Edit Mapping" : "Add Client Product Mapping"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="client_id">Client</Label>
              <Select name="client_id" defaultValue={mapping?.client_id} required>
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
              <Select name="product_id" defaultValue={mapping?.product_id} required>
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

            <div className="grid gap-2">
              <Label htmlFor="broker_id">Broker</Label>
              <Select name="broker_id" defaultValue={mapping?.broker_id} required>
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
              <Label htmlFor="sales_lead_id">Sales Lead</Label>
              <Select name="sales_lead_id" defaultValue={mapping?.sales_lead_id} required>
                <SelectTrigger id="sales_lead_id">
                  <SelectValue placeholder="Select Sales Lead" />
                </SelectTrigger>
                <SelectContent>
                  {salesLeads.map((lead) => (
                    <SelectItem key={lead.id} value={lead.id}>
                      {lead.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="channel_type">Channel Type</Label>
              <Select name="channel_type" defaultValue={mapping?.channel_type || "Online"} required>
                <SelectTrigger id="channel_type">
                  <SelectValue placeholder="Select Channel Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Online">Online</SelectItem>
                  <SelectItem value="Phygital">Phygital</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="start_date">Start Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    id="start_date"
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
