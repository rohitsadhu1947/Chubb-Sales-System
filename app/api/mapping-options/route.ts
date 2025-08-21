import { sql } from "@/lib/db"
import { NextResponse } from "next/server"

export async function GET() {
  try {
    // Fetch all required data in parallel
    const [clients, products, brokers, salesLeads] = await Promise.all([
      sql`SELECT id, name FROM clients ORDER BY name ASC`,
      sql`SELECT id, name FROM products ORDER BY name ASC`,
      sql`SELECT id, name FROM brokers ORDER BY name ASC`,
      sql`SELECT id, name FROM sales_leads ORDER BY name ASC`,
    ])

    return NextResponse.json({
      clients,
      products,
      brokers,
      salesLeads,
    })
  } catch (error) {
    console.error("Database error:", error)
    return NextResponse.json({ error: "Failed to fetch options" }, { status: 500 })
  }
}
