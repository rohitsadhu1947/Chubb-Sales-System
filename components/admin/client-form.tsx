"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { createClient, updateClient } from "@/lib/actions"
import type { Client } from "@/lib/db"
import { PermissionGuard } from "@/components/permission-guard"

interface ClientFormProps {
  isOpen: boolean
  onClose: () => void
  client?: Client
}

export function ClientForm({ isOpen, onClose, client }: ClientFormProps) {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsSubmitting(true)
    setError(null)

    const formData = new FormData(e.currentTarget)

    try {
      if (client) {
        const result = await updateClient(client.id, formData)
        if (result.error) {
          setError(result.error)
        } else {
          onClose()
        }
      } else {
        const result = await createClient(formData)
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
          <DialogTitle>{client ? "Edit Client" : "Add Client"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Name</Label>
              <Input id="name" name="name" defaultValue={client?.name || ""} required />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="industry">Industry</Label>
              <Input id="industry" name="industry" defaultValue={client?.industry || ""} required />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="region">Region</Label>
              <Input id="region" name="region" defaultValue={client?.region || ""} required />
            </div>
          </div>
          {error && <p className="text-sm text-destructive mb-4">{error}</p>}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <PermissionGuard
              moduleName="clients"
              permissionName={client ? "edit" : "edit"}
              fallback={
                <Button type="button" variant="outline" disabled>
                  Not Authorized
                </Button>
              }
            >
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Saving..." : "Save"}
              </Button>
            </PermissionGuard>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
