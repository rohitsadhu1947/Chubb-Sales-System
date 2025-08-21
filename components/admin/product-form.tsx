"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { createProduct, updateProduct } from "@/lib/actions"
import type { Product } from "@/lib/db"

interface ProductFormProps {
  isOpen: boolean
  onClose: () => void
  product?: Product
}

export function ProductForm({ isOpen, onClose, product }: ProductFormProps) {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsSubmitting(true)
    setError(null)

    const formData = new FormData(e.currentTarget)

    try {
      if (product) {
        const result = await updateProduct(product.id, formData)
        if (result.error) {
          setError(result.error)
        } else {
          onClose()
        }
      } else {
        const result = await createProduct(formData)
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
          <DialogTitle>{product ? "Edit Product" : "Add Product"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Name</Label>
              <Input id="name" name="name" defaultValue={product?.name || ""} required />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="category">Category</Label>
              <Input id="category" name="category" defaultValue={product?.category || ""} required />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="insurer_name">Insurer Name</Label>
              <Input id="insurer_name" name="insurer_name" defaultValue={product?.insurer_name || ""} required />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="base_commission_pct">Base Commission %</Label>
              <Input
                id="base_commission_pct"
                name="base_commission_pct"
                type="number"
                step="0.01"
                defaultValue={product?.base_commission_pct || ""}
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="cdp_fee_pct">CDP Fee %</Label>
              <Input
                id="cdp_fee_pct"
                name="cdp_fee_pct"
                type="number"
                step="0.01"
                defaultValue={product?.cdp_fee_pct || ""}
                required
              />
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
