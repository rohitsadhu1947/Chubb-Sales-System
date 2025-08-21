"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { DataTable } from "@/components/ui/data-table"
import { ProductForm } from "@/components/admin/product-form"
import { DeleteConfirmation } from "@/components/admin/delete-confirmation"
import { Plus } from "lucide-react"
import { getProducts, deleteProduct } from "@/lib/actions"
import type { Product } from "@/lib/db"
import { useRouter } from "next/navigation"

export default function ProductsPage() {
  const router = useRouter()
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [isDeleteOpen, setIsDeleteOpen] = useState(false)
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)

  // Fetch products on component mount - FIXED: Changed useState to useEffect
  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const { products, error } = await getProducts()
        if (error) {
          setError(error)
        } else {
          setProducts(products || [])
        }
      } catch (err) {
        setError("Failed to fetch products")
      } finally {
        setLoading(false)
      }
    }

    fetchProducts()
  }, [])

  const handleAddProduct = () => {
    setSelectedProduct(null)
    setIsFormOpen(true)
  }

  const handleEditProduct = (product: Product) => {
    setSelectedProduct(product)
    setIsFormOpen(true)
  }

  const handleDeleteProduct = (product: Product) => {
    setSelectedProduct(product)
    setIsDeleteOpen(true)
  }

  const confirmDelete = async () => {
    if (!selectedProduct) return

    try {
      const result = await deleteProduct(selectedProduct.id)
      if (result.error) {
        setError(result.error)
      } else {
        // Refresh the product list
        router.refresh()

        // Update local state
        setProducts(products.filter((p) => p.id !== selectedProduct.id))
      }
    } catch (err) {
      setError("Failed to delete product")
    }
  }

  const columns = [
    { key: "name", header: "Name" },
    { key: "category", header: "Category" },
    { key: "insurer_name", header: "Insurer" },
    {
      key: "base_commission_pct",
      header: "Base Commission %",
      render: (product: Product) => `${product.base_commission_pct}%`,
    },
    {
      key: "cdp_fee_pct",
      header: "CDP Fee %",
      render: (product: Product) => `${product.cdp_fee_pct}%`,
    },
  ]

  if (loading) {
    return <div className="flex justify-center p-8">Loading products...</div>
  }

  if (error) {
    return <div className="text-destructive p-8">{error}</div>
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Products</h2>
        <Button onClick={handleAddProduct}>
          <Plus className="mr-2 h-4 w-4" />
          Add Product
        </Button>
      </div>

      <DataTable data={products} columns={columns} onEdit={handleEditProduct} onDelete={handleDeleteProduct} />

      <ProductForm isOpen={isFormOpen} onClose={() => setIsFormOpen(false)} product={selectedProduct || undefined} />

      <DeleteConfirmation
        isOpen={isDeleteOpen}
        onClose={() => setIsDeleteOpen(false)}
        onConfirm={confirmDelete}
        title="Delete Product"
        description={`Are you sure you want to delete ${selectedProduct?.name}? This action cannot be undone.`}
      />
    </div>
  )
}
