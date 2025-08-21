import { neon } from "@neondatabase/serverless"

// Create a SQL client
export const sql = neon(process.env.DATABASE_URL!)

// Client type
export type Client = {
  id: string
  name: string
  industry: string
  region: string
  created_at: string
}

// Product type
export type Product = {
  id: string
  name: string
  category: string
  insurer_name: string
  base_commission_pct: number
  cdp_fee_pct: number
}

// Broker type
export type Broker = {
  id: string
  name: string
  contact_email: string
  partner_type: string
}

// Sales Lead type
export type SalesLead = {
  id: string
  name: string
  email: string
  phone: string
}

// ClientProductMap type
export type ClientProductMap = {
  id: string
  client_id: string
  product_id: string
  broker_id: string
  sales_lead_id: string
  channel_type: string
  start_date: string
  client_name?: string
  product_name?: string
  broker_name?: string
  sales_lead_name?: string
}

// SalesData type
export type SalesData = {
  id: string
  client_id: string
  product_id: string
  broker_id: string
  channel_type: string
  nbp_inr: number
  gwp_inr: number
  nbp_usd: number
  gwp_usd: number
  broker_commission_pct: number
  broker_commission_inr: number
  cdp_fee_pct: number
  cdp_fee_inr: number
  sale_date: string
  client_name?: string
  product_name?: string
  broker_name?: string
}

// ExchangeRate type
export type ExchangeRate = {
  id: string
  date: string
  rate: number
}

// User type - updated to match actual database structure
export type User = {
  id: string
  username?: string // Added for compatibility
  password?: string // Added for database operations
  full_name?: string // Added for compatibility
  email: string
  role: "admin" | "viewer" | "dataentry"
  created_at?: string // Made optional
  last_login?: string // Made optional
}
