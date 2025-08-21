"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { createBroker, updateBroker } from "@/lib/actions"
import type { Broker } from "@/lib/db"

interface BrokerFormProps {
  isOpen: boolean
  onClose: () => void
  broker?: Broker
}

export function BrokerForm({ isOpen, onClose, broker }: BrokerFormProps) {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsSubmitting(true)
    setError(null)

    const formData = new FormData(e.currentTarget)

    try {
      if (broker) {
        const result = await updateBroker(broker.id, formData)
        if (result.error) {
          setError(result.error)
        } else {
          onClose()
        }
      } else {
        const result = await createBroker(formData)
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
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{broker ? "Edit Broker" : "Add Broker"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Name</Label>
              <Input id="name" name="name" defaultValue={broker?.name || ""} required />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="contact_email">Contact Email</Label>
              <Input
                id="contact_email"
                name="contact_email"
                type="email"
                defaultValue={broker?.contact_email || ""}
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="partner_type">Partner Type</Label>
              <Input id="partner_type" name="partner_type" defaultValue={broker?.partner_type || ""} required />
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
