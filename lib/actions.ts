"use server"

import { sql } from "@/lib/db"
import { revalidatePath } from "next/cache"
import { v4 as uuidv4 } from "uuid"

// Dashboard actions
export async function getDashboardData({
  fromDate,
  toDate,
  clientId,
  productId,
  brokerId,
  channelType,
}: {
  fromDate: string
  toDate: string
  clientId?: string
  productId?: string
  brokerId?: string
  channelType?: string
}) {
  try {
    console.log("Dashboard data params:", { fromDate, toDate, clientId, productId, brokerId, channelType })

    // Instead of using sql.unsafe, let's use the standard sql template literal
    // which has a more consistent return format
    let result

    // Base query with date filter
    const baseQuery = `
      SELECT 
        COALESCE(SUM(gwp_inr), 0) as total_gwp_inr,
        COALESCE(SUM(nbp_inr), 0) as total_nbp_inr,
        COALESCE(SUM(broker_commission_inr), 0) as total_broker_commission_inr,
        COALESCE(SUM(cdp_fee_inr), 0) as total_cdp_fee_inr
      FROM sales_data
      WHERE sale_date BETWEEN '${fromDate}' AND '${toDate}'
    `

    // Add additional filters
    const filters = []
    if (clientId && clientId !== "all") {
      filters.push(`client_id = '${clientId}'`)
    }
    if (productId && productId !== "all") {
      filters.push(`product_id = '${productId}'`)
    }
    if (brokerId && brokerId !== "all") {
      filters.push(`broker_id = '${brokerId}'`)
    }
    if (channelType && channelType !== "all") {
      filters.push(`channel_type = '${channelType}'`)
    }

    // Combine filters with AND if any exist
    let fullQuery = baseQuery
    if (filters.length > 0) {
      fullQuery += ` AND ${filters.join(" AND ")}`
    }

    console.log("Executing query:", fullQuery)

    // Execute the query directly with sql template literal
    result = await sql`${sql.unsafe(fullQuery)}`

    console.log("Raw query result:", result)

    // Check if we have valid results
    if (!result || result.length === 0) {
      console.log("No results found")
      return {
        totalGwpInr: 0,
        totalNbpInr: 0,
        totalGwpUsd: 0,
        totalNbpUsd: 0,
        totalBrokerCommissionInr: 0,
        totalBrokerCommissionUsd: 0,
        totalCdpFeeInr: 0,
        totalCdpFeeUsd: 0,
        exchangeRate: 83.5,
      }
    }

    // Get the first row of the result
    const row = result[0]
    console.log("First row of result:", row)

    // Safely extract values from the result and convert string values to numbers
    const totalGwpInr = Number(row?.total_gwp_inr ?? 0)
    const totalNbpInr = Number(row?.total_nbp_inr ?? 0)
    const totalBrokerCommissionInr = Number(row?.total_broker_commission_inr ?? 0)
    const totalCdpFeeInr = Number(row?.total_cdp_fee_inr ?? 0)

    console.log("Extracted values:", {
      totalGwpInr,
      totalNbpInr,
      totalBrokerCommissionInr,
      totalCdpFeeInr,
    })

    // Get the latest exchange rate
    const exchangeRateResult = await sql`
      SELECT rate FROM exchange_rates ORDER BY date DESC LIMIT 1
    `

    const rate = exchangeRateResult && exchangeRateResult.length > 0 ? Number(exchangeRateResult[0].rate) : 83.5

    // Calculate USD values
    const totalGwpUsd = totalGwpInr / rate
    const totalNbpUsd = totalNbpInr / rate
    const totalBrokerCommissionUsd = totalBrokerCommissionInr / rate
    const totalCdpFeeUsd = totalCdpFeeInr / rate

    return {
      totalGwpInr,
      totalNbpInr,
      totalGwpUsd,
      totalNbpUsd,
      totalBrokerCommissionInr,
      totalBrokerCommissionUsd,
      totalCdpFeeInr,
      totalCdpFeeUsd,
      exchangeRate: rate,
    }
  } catch (error) {
    console.error("Error fetching dashboard data:", error)
    return {
      error: `Failed to fetch dashboard data: ${error instanceof Error ? error.message : String(error)}`,
      totalGwpInr: 0,
      totalNbpInr: 0,
      totalGwpUsd: 0,
      totalNbpUsd: 0,
      totalBrokerCommissionInr: 0,
      totalBrokerCommissionUsd: 0,
      totalCdpFeeInr: 0,
      totalCdpFeeUsd: 0,
      exchangeRate: 83.5,
    }
  }
}

// Client actions
export async function getClients() {
  try {
    const clients = await sql`
    SELECT * FROM clients ORDER BY name ASC
  `
    return { clients }
  } catch (error) {
    return { error: "Failed to fetch clients" }
  }
}

export async function getClient(id: string) {
  try {
    const [client] = await sql`
    SELECT * FROM clients WHERE id = ${id}
  `
    return { client }
  } catch (error) {
    return { error: "Failed to fetch client" }
  }
}

export async function createClient(formData: FormData) {
  const id = uuidv4()
  const name = formData.get("name") as string
  const industry = formData.get("industry") as string
  const region = formData.get("region") as string
  const created_at = new Date().toISOString()

  try {
    await sql`
    INSERT INTO clients (id, name, industry, region, created_at)
    VALUES (${id}, ${name}, ${industry}, ${region}, ${created_at})
  `
    revalidatePath("/admin/clients")
    return { success: true }
  } catch (error) {
    return { error: "Failed to create client" }
  }
}

export async function updateClient(id: string, formData: FormData) {
  const name = formData.get("name") as string
  const industry = formData.get("industry") as string
  const region = formData.get("region") as string

  try {
    await sql`
    UPDATE clients
    SET name = ${name}, industry = ${industry}, region = ${region}
    WHERE id = ${id}
  `
    revalidatePath("/admin/clients")
    return { success: true }
  } catch (error) {
    return { error: "Failed to update client" }
  }
}

export async function deleteClient(id: string) {
  try {
    await sql`DELETE FROM clients WHERE id = ${id}`
    revalidatePath("/admin/clients")
    return { success: true }
  } catch (error) {
    return { error: "Failed to delete client" }
  }
}

// Product actions
export async function getProducts() {
  try {
    const products = await sql`
    SELECT * FROM products ORDER BY name ASC
  `
    return { products }
  } catch (error) {
    return { error: "Failed to fetch products" }
  }
}

export async function getProduct(id: string) {
  try {
    const [product] = await sql`
    SELECT * FROM products WHERE id = ${id}
  `
    return { product }
  } catch (error) {
    return { error: "Failed to fetch product" }
  }
}

export async function createProduct(formData: FormData) {
  const id = uuidv4()
  const name = formData.get("name") as string
  const category = formData.get("category") as string
  const insurer_name = formData.get("insurer_name") as string
  const base_commission_pct = Number.parseFloat(formData.get("base_commission_pct") as string)
  const cdp_fee_pct = Number.parseFloat(formData.get("cdp_fee_pct") as string)

  try {
    await sql`
    INSERT INTO products (id, name, category, insurer_name, base_commission_pct, cdp_fee_pct)
    VALUES (${id}, ${name}, ${category}, ${insurer_name}, ${base_commission_pct}, ${cdp_fee_pct})
  `
    revalidatePath("/admin/products")
    return { success: true }
  } catch (error) {
    return { error: "Failed to create product" }
  }
}

export async function updateProduct(id: string, formData: FormData) {
  const name = formData.get("name") as string
  const category = formData.get("category") as string
  const insurer_name = formData.get("insurer_name") as string
  const base_commission_pct = Number.parseFloat(formData.get("base_commission_pct") as string)
  const cdp_fee_pct = Number.parseFloat(formData.get("cdp_fee_pct") as string)

  try {
    await sql`
    UPDATE products
    SET name = ${name}, category = ${category}, insurer_name = ${insurer_name}, 
        base_commission_pct = ${base_commission_pct}, cdp_fee_pct = ${cdp_fee_pct}
    WHERE id = ${id}
  `
    revalidatePath("/admin/products")
    return { success: true }
  } catch (error) {
    return { error: "Failed to update product" }
  }
}

export async function deleteProduct(id: string) {
  try {
    await sql`DELETE FROM products WHERE id = ${id}`
    revalidatePath("/admin/products")
    return { success: true }
  } catch (error) {
    return { error: "Failed to delete product" }
  }
}

// Broker actions
export async function getBrokers() {
  try {
    const brokers = await sql`
    SELECT * FROM brokers ORDER BY name ASC
  `
    return { brokers }
  } catch (error) {
    return { error: "Failed to fetch brokers" }
  }
}

export async function getBroker(id: string) {
  try {
    const [broker] = await sql`
    SELECT * FROM brokers WHERE id = ${id}
  `
    return { broker }
  } catch (error) {
    return { error: "Failed to fetch broker" }
  }
}

export async function createBroker(formData: FormData) {
  const id = uuidv4()
  const name = formData.get("name") as string
  const contact_email = formData.get("contact_email") as string
  const partner_type = formData.get("partner_type") as string

  try {
    await sql`
    INSERT INTO brokers (id, name, contact_email, partner_type)
    VALUES (${id}, ${name}, ${contact_email}, ${partner_type})
  `
    revalidatePath("/admin/brokers")
    return { success: true }
  } catch (error) {
    return { error: "Failed to create broker" }
  }
}

export async function updateBroker(id: string, formData: FormData) {
  const name = formData.get("name") as string
  const contact_email = formData.get("contact_email") as string
  const partner_type = formData.get("partner_type") as string

  try {
    await sql`
    UPDATE brokers
    SET name = ${name}, contact_email = ${contact_email}, partner_type = ${partner_type}
    WHERE id = ${id}
  `
    revalidatePath("/admin/brokers")
    return { success: true }
  } catch (error) {
    return { error: "Failed to update broker" }
  }
}

export async function deleteBroker(id: string) {
  try {
    await sql`DELETE FROM brokers WHERE id = ${id}`
    revalidatePath("/admin/brokers")
    return { success: true }
  } catch (error) {
    return { error: "Failed to delete broker" }
  }
}

// Sales Lead actions
export async function getSalesLeads() {
  try {
    const salesLeads = await sql`
    SELECT * FROM sales_leads ORDER BY name ASC
  `
    return { salesLeads }
  } catch (error) {
    return { error: "Failed to fetch sales leads" }
  }
}

export async function getSalesLead(id: string) {
  try {
    const [salesLead] = await sql`
    SELECT * FROM sales_leads WHERE id = ${id}
  `
    return { salesLead }
  } catch (error) {
    return { error: "Failed to fetch sales lead" }
  }
}

export async function createSalesLead(formData: FormData) {
  const id = uuidv4()
  const name = formData.get("name") as string
  const email = formData.get("email") as string
  const phone = formData.get("phone") as string

  try {
    await sql`
    INSERT INTO sales_leads (id, name, email, phone)
    VALUES (${id}, ${name}, ${email}, ${phone})
  `
    revalidatePath("/admin/sales-leads")
    return { success: true }
  } catch (error) {
    return { error: "Failed to create sales lead" }
  }
}

export async function updateSalesLead(id: string, formData: FormData) {
  const name = formData.get("name") as string
  const email = formData.get("email") as string
  const phone = formData.get("phone") as string

  try {
    await sql`
    UPDATE sales_leads
    SET name = ${name}, email = ${email}, phone = ${phone}
    WHERE id = ${id}
  `
    revalidatePath("/admin/sales-leads")
    return { success: true }
  } catch (error) {
    return { error: "Failed to update sales lead" }
  }
}

export async function deleteSalesLead(id: string) {
  try {
    await sql`DELETE FROM sales_leads WHERE id = ${id}`
    revalidatePath("/admin/sales-leads")
    return { success: true }
  } catch (error) {
    return { error: "Failed to delete sales lead" }
  }
}

// Client Product Mapping actions
export async function getClientProductMappings() {
  try {
    const mappings = await sql`
    SELECT 
      cpm.*,
      c.name as client_name,
      p.name as product_name,
      b.name as broker_name,
      sl.name as sales_lead_name
    FROM client_product_map cpm
    JOIN clients c ON cpm.client_id = c.id
    JOIN products p ON cpm.product_id = p.id
    JOIN brokers b ON cpm.broker_id = b.id
    JOIN sales_leads sl ON cpm.sales_lead_id = sl.id
    ORDER BY c.name ASC
  `
    return { mappings }
  } catch (error) {
    return { error: "Failed to fetch client product mappings" }
  }
}

export async function getClientProductMapping(id: string) {
  try {
    const [mapping] = await sql`
    SELECT * FROM client_product_map WHERE id = ${id}
  `
    return { mapping }
  } catch (error) {
    return { error: "Failed to fetch client product mapping" }
  }
}

export async function createClientProductMapping(formData: FormData) {
  const id = uuidv4()
  const client_id = formData.get("client_id") as string
  const product_id = formData.get("product_id") as string
  const broker_id = formData.get("broker_id") as string
  const sales_lead_id = formData.get("sales_lead_id") as string
  const channel_type = formData.get("channel_type") as string
  const start_date = formData.get("start_date") as string

  try {
    await sql`
    INSERT INTO client_product_map (id, client_id, product_id, broker_id, sales_lead_id, channel_type, start_date)
    VALUES (${id}, ${client_id}, ${product_id}, ${broker_id}, ${sales_lead_id}, ${channel_type}, ${start_date})
  `
    revalidatePath("/admin/client-product-mapping")
    return { success: true }
  } catch (error) {
    return { error: "Failed to create client product mapping" }
  }
}

export async function updateClientProductMapping(id: string, formData: FormData) {
  const client_id = formData.get("client_id") as string
  const product_id = formData.get("product_id") as string
  const broker_id = formData.get("broker_id") as string
  const sales_lead_id = formData.get("sales_lead_id") as string
  const channel_type = formData.get("channel_type") as string
  const start_date = formData.get("start_date") as string

  try {
    await sql`
    UPDATE client_product_map
    SET client_id = ${client_id}, product_id = ${product_id}, broker_id = ${broker_id}, 
        sales_lead_id = ${sales_lead_id}, channel_type = ${channel_type}, start_date = ${start_date}
    WHERE id = ${id}
  `
    revalidatePath("/admin/client-product-mapping")
    return { success: true }
  } catch (error) {
    return { error: "Failed to update client product mapping" }
  }
}

export async function deleteClientProductMapping(id: string) {
  try {
    await sql`DELETE FROM client_product_map WHERE id = ${id}`
    revalidatePath("/admin/client-product-mapping")
    return { success: true }
  } catch (error) {
    return { error: "Failed to delete client product mapping" }
  }
}

// Exchange Rate actions
export async function getLatestExchangeRate() {
  try {
    const [rate] = await sql`
    SELECT * FROM exchange_rates 
    ORDER BY date DESC 
    LIMIT 1
  `

    // If no rate exists, create a default one
    if (!rate) {
      const id = uuidv4()
      const today = new Date().toISOString().split("T")[0]
      const defaultRate = 83.5 // Default INR to USD rate

      await sql`
      INSERT INTO exchange_rates (id, date, rate)
      VALUES (${id}, ${today}, ${defaultRate})
    `

      return { rate: { id, date: today, rate: defaultRate } }
    }

    return { rate }
  } catch (error) {
    return { error: "Failed to fetch exchange rate", rate: { rate: 83.5 } }
  }
}

export async function createExchangeRate(formData: FormData) {
  const id = uuidv4()
  const date = formData.get("date") as string
  const rate = Number.parseFloat(formData.get("rate") as string)

  try {
    await sql`
    INSERT INTO exchange_rates (id, date, rate)
    VALUES (${id}, ${date}, ${rate})
  `
    revalidatePath("/admin/exchange-rates")
    return { success: true }
  } catch (error) {
    return { error: "Failed to create exchange rate" }
  }
}

// Sales Data actions
export async function getSalesData() {
  try {
    const salesData = await sql`
    SELECT 
      s.*,
      c.name as client_name,
      p.name as product_name,
      b.name as broker_name
    FROM sales_data s
    JOIN clients c ON s.client_id = c.id
    JOIN products p ON s.product_id = p.id
    JOIN brokers b ON s.broker_id = b.id
    ORDER BY s.sale_date DESC
  `

    // Log the first item to see its structure
    if (salesData && salesData.length > 0) {
      console.log("First sales data item:", JSON.stringify(salesData[0], null, 2))
    } else {
      console.log("No sales data found")
    }

    return { salesData }
  } catch (error) {
    console.error("Error fetching sales data:", error)
    return { error: "Failed to fetch sales data" }
  }
}

export async function getSalesDataById(id: string) {
  try {
    const [salesData] = await sql`
    SELECT * FROM sales_data WHERE id = ${id}
  `
    return { salesData }
  } catch (error) {
    return { error: "Failed to fetch sales data" }
  }
}

export async function createSalesData(formData: FormData) {
  const id = uuidv4()
  const client_id = formData.get("client_id") as string
  const product_id = formData.get("product_id") as string
  const broker_id = formData.get("broker_id") as string
  const channel_type = formData.get("channel_type") as string
  const nbp_inr = Number.parseFloat(formData.get("nbp_inr") as string)
  const gwp_inr = Number.parseFloat(formData.get("gwp_inr") as string)
  const nbp_usd = Number.parseFloat(formData.get("nbp_usd") as string)
  const gwp_usd = Number.parseFloat(formData.get("gwp_usd") as string)
  const broker_commission_pct = Number.parseFloat(formData.get("broker_commission_pct") as string)
  const broker_commission_inr = Number.parseFloat(formData.get("broker_commission_inr") as string)
  const cdp_fee_pct = Number.parseFloat(formData.get("cdp_fee_pct") as string)
  const cdp_fee_inr = Number.parseFloat(formData.get("cdp_fee_inr") as string)
  const sale_date = formData.get("sale_date") as string

  try {
    await sql`
    INSERT INTO sales_data (
      id, client_id, product_id, broker_id, channel_type, 
      nbp_inr, gwp_inr, nbp_usd, gwp_usd, 
      broker_commission_pct, broker_commission_inr, 
      cdp_fee_pct, cdp_fee_inr, sale_date
    )
    VALUES (
      ${id}, ${client_id}, ${product_id}, ${broker_id}, ${channel_type}, 
      ${nbp_inr}, ${gwp_inr}, ${nbp_usd}, ${gwp_usd}, 
      ${broker_commission_pct}, ${broker_commission_inr}, 
      ${cdp_fee_pct}, ${cdp_fee_inr}, ${sale_date}
    )
  `
    revalidatePath("/admin/sales-upload")
    return { success: true }
  } catch (error) {
    console.error("Error creating sales data:", error)
    return { error: "Failed to create sales data" }
  }
}

export async function updateSalesData(id: string, formData: FormData) {
  const client_id = formData.get("client_id") as string
  const product_id = formData.get("product_id") as string
  const broker_id = formData.get("broker_id") as string
  const channel_type = formData.get("channel_type") as string
  const nbp_inr = Number.parseFloat(formData.get("nbp_inr") as string)
  const gwp_inr = Number.parseFloat(formData.get("gwp_inr") as string)
  const nbp_usd = Number.parseFloat(formData.get("nbp_usd") as string)
  const gwp_usd = Number.parseFloat(formData.get("gwp_usd") as string)
  const broker_commission_pct = Number.parseFloat(formData.get("broker_commission_pct") as string)
  const broker_commission_inr = Number.parseFloat(formData.get("broker_commission_inr") as string)
  const cdp_fee_pct = Number.parseFloat(formData.get("cdp_fee_pct") as string)
  const cdp_fee_inr = Number.parseFloat(formData.get("cdp_fee_inr") as string)
  const sale_date = formData.get("sale_date") as string

  try {
    await sql`
    UPDATE sales_data
    SET 
      client_id = ${client_id}, 
      product_id = ${product_id}, 
      broker_id = ${broker_id}, 
      channel_type = ${channel_type}, 
      nbp_inr = ${nbp_inr}, 
      gwp_inr = ${gwp_inr}, 
      nbp_usd = ${nbp_usd}, 
      gwp_usd = ${gwp_usd}, 
      broker_commission_pct = ${broker_commission_pct}, 
      broker_commission_inr = ${broker_commission_inr}, 
      cdp_fee_pct = ${cdp_fee_pct}, 
      cdp_fee_inr = ${cdp_fee_inr}, 
      sale_date = ${sale_date}
    WHERE id = ${id}
  `
    revalidatePath("/admin/sales-upload")
    return { success: true }
  } catch (error) {
    return { error: "Failed to update sales data" }
  }
}

export async function deleteSalesData(id: string) {
  try {
    await sql`DELETE FROM sales_data WHERE id = ${id}`
    revalidatePath("/admin/sales-upload")
    return { success: true }
  } catch (error) {
    return { error: "Failed to delete sales data" }
  }
}

export async function getProductDetails(id: string) {
  try {
    const [product] = await sql`
    SELECT * FROM products WHERE id = ${id}
  `
    return { product }
  } catch (error) {
    return { error: "Failed to fetch product details" }
  }
}

// Monthly Trends actions
export async function getMonthlyTrendsData({
  fromDate,
  toDate,
  clientId,
  productId,
  brokerId,
  channelType,
}: {
  fromDate: string
  toDate: string
  clientId?: string
  productId?: string
  brokerId?: string
  channelType?: string
}) {
  try {
    console.log("Monthly trends data params:", { fromDate, toDate, clientId, productId, brokerId, channelType })

    // Query for monthly GWP per product per partner
    let monthlyGwpQuery = `
      SELECT 
        TO_CHAR(sale_date, 'YYYY-MM') as month,
        p.name as product_name,
        b.name as broker_name,
        channel_type,
        SUM(gwp_inr) as total_gwp_inr,
        SUM(broker_commission_inr) as total_commission_inr,
        SUM(cdp_fee_inr) as total_cdp_fee_inr
      FROM sales_data s
      JOIN products p ON s.product_id = p.id
      JOIN brokers b ON s.broker_id = b.id
      WHERE sale_date BETWEEN '${fromDate}' AND '${toDate}'
    `

    // Add additional filters
    const filters = []
    if (clientId && clientId !== "all") {
      filters.push(`client_id = '${clientId}'`)
    }
    if (productId && productId !== "all") {
      filters.push(`s.product_id = '${productId}'`)
    }
    if (brokerId && brokerId !== "all") {
      filters.push(`s.broker_id = '${brokerId}'`)
    }
    if (channelType && channelType !== "all") {
      filters.push(`channel_type = '${channelType}'`)
    }

    // Combine filters with AND if any exist
    if (filters.length > 0) {
      monthlyGwpQuery += ` AND ${filters.join(" AND ")}`
    }

    // Add group by and order by
    monthlyGwpQuery += `
      GROUP BY month, p.name, b.name, channel_type
      ORDER BY month, p.name, b.name, channel_type
    `

    console.log("Executing monthly GWP query:", monthlyGwpQuery)

    // Execute the query
    const monthlyData = await sql`${sql.unsafe(monthlyGwpQuery)}`
    console.log("Monthly data results:", monthlyData.length)

    // Process the data for charts
    const months = [...new Set(monthlyData.map((item) => item.month))].sort()

    // Process data for GWP line chart
    const gwpLineData = {
      labels: months,
      datasets: [],
    }

    // Process data for commission vs CDP fee bar chart
    const commissionVsFeeData = {
      labels: months,
      datasets: [
        {
          label: "Broker Commission",
          data: [],
          backgroundColor: "rgba(53, 162, 235, 0.5)",
        },
        {
          label: "CDP Fee",
          data: [],
          backgroundColor: "rgba(255, 99, 132, 0.5)",
        },
      ],
    }

    // Group by product, broker, channel for line chart
    const productBrokerChannelGroups = {}

    monthlyData.forEach((item) => {
      const key = `${item.product_name}-${item.broker_name}-${item.channel_type}`
      if (!productBrokerChannelGroups[key]) {
        productBrokerChannelGroups[key] = {
          label: `${item.product_name} / ${item.broker_name} / ${item.channel_type}`,
          data: Array(months.length).fill(0),
          borderColor: getRandomColor(),
          tension: 0.1,
        }
      }

      const monthIndex = months.indexOf(item.month)
      if (monthIndex !== -1) {
        productBrokerChannelGroups[key].data[monthIndex] = Number(item.total_gwp_inr)
      }
    })

    // Add datasets to gwpLineData
    gwpLineData.datasets = Object.values(productBrokerChannelGroups)

    // Calculate monthly totals for commission vs fee bar chart
    const monthlyTotals = {}
    monthlyData.forEach((item) => {
      if (!monthlyTotals[item.month]) {
        monthlyTotals[item.month] = {
          commission: 0,
          fee: 0,
        }
      }
      monthlyTotals[item.month].commission += Number(item.total_commission_inr)
      monthlyTotals[item.month].fee += Number(item.total_cdp_fee_inr)
    })

    // Fill in the commission vs fee datasets
    months.forEach((month, index) => {
      commissionVsFeeData.datasets[0].data[index] = monthlyTotals[month]?.commission || 0
      commissionVsFeeData.datasets[1].data[index] = monthlyTotals[month]?.fee || 0
    })

    return {
      gwpLineData,
      commissionVsFeeData,
      months,
    }
  } catch (error) {
    console.error("Error fetching monthly trends data:", error)
    return {
      error: `Failed to fetch monthly trends data: ${error instanceof Error ? error.message : String(error)}`,
      gwpLineData: { labels: [], datasets: [] },
      commissionVsFeeData: { labels: [], datasets: [] },
      months: [],
    }
  }
}

// Helper function to generate random colors for chart lines
function getRandomColor() {
  const letters = "0123456789ABCDEF"
  let color = "#"
  for (let i = 0; i < 6; i++) {
    color += letters[Math.floor(Math.random() * 16)]
  }
  return color
}

// Commission Report actions
export async function getCommissionReportData({
  fromDate,
  toDate,
  clientId,
  productId,
  brokerId,
  channelType,
}: {
  fromDate: string
  toDate: string
  clientId?: string
  productId?: string
  brokerId?: string
  channelType?: string
}) {
  try {
    console.log("Commission report data params:", { fromDate, toDate, clientId, productId, brokerId, channelType })

    // Base query with date filter and joins
    let query = `
      SELECT 
        c.id as client_id,
        c.name as client_name,
        p.id as product_id,
        p.name as product_name,
        b.id as broker_id,
        b.name as broker_name,
        s.channel_type,
        SUM(s.gwp_inr) as total_gwp_inr,
        AVG(s.broker_commission_pct) as avg_commission_pct,
        SUM(s.broker_commission_inr) as total_commission_inr,
        AVG(s.cdp_fee_pct) as avg_cdp_fee_pct,
        SUM(s.cdp_fee_inr) as total_cdp_fee_inr
      FROM sales_data s
      JOIN clients c ON s.client_id = c.id
      JOIN products p ON s.product_id = p.id
      JOIN brokers b ON s.broker_id = b.id
      WHERE s.sale_date BETWEEN '${fromDate}' AND '${toDate}'
    `

    // Add additional filters
    const filters = []
    if (clientId && clientId !== "all") {
      filters.push(`s.client_id = '${clientId}'`)
    }
    if (productId && productId !== "all") {
      filters.push(`s.product_id = '${productId}'`)
    }
    if (brokerId && brokerId !== "all") {
      filters.push(`s.broker_id = '${brokerId}'`)
    }
    if (channelType && channelType !== "all") {
      filters.push(`s.channel_type = '${channelType}'`)
    }

    // Combine filters with AND if any exist
    if (filters.length > 0) {
      query += ` AND ${filters.join(" AND ")}`
    }

    // Add group by and order by
    query += `
      GROUP BY c.id, c.name, p.id, p.name, b.id, b.name, s.channel_type
      ORDER BY c.name, p.name, b.name, s.channel_type
    `

    console.log("Executing commission report query:", query)

    // Execute the query
    const result = await sql`${sql.unsafe(query)}`
    console.log("Commission report results:", result.length)

    // Process the data to group by client
    const clientsMap = new Map()

    result.forEach((row) => {
      const clientId = row.client_id

      if (!clientsMap.has(clientId)) {
        clientsMap.set(clientId, {
          id: clientId,
          name: row.client_name,
          totalGwpInr: 0,
          totalCommissionInr: 0,
          totalCdpFeeInr: 0,
          avgCommissionPct: 0,
          avgCdpFeePct: 0,
          details: [],
        })
      }

      const client = clientsMap.get(clientId)

      // Add to client totals
      client.totalGwpInr += Number(row.total_gwp_inr || 0)
      client.totalCommissionInr += Number(row.total_commission_inr || 0)
      client.totalCdpFeeInr += Number(row.total_cdp_fee_inr || 0)

      // Add detail row
      client.details.push({
        productId: row.product_id,
        productName: row.product_name,
        brokerId: row.broker_id,
        brokerName: row.broker_name,
        channelType: row.channel_type,
        gwpInr: Number(row.total_gwp_inr || 0),
        commissionPct: Number(row.avg_commission_pct || 0),
        commissionInr: Number(row.total_commission_inr || 0),
        cdpFeePct: Number(row.avg_cdp_fee_pct || 0),
        cdpFeeInr: Number(row.total_cdp_fee_inr || 0),
      })
    })

    // Calculate averages for each client
    clientsMap.forEach((client) => {
      if (client.totalGwpInr > 0) {
        client.avgCommissionPct = (client.totalCommissionInr / client.totalGwpInr) * 100
        client.avgCdpFeePct = (client.totalCdpFeeInr / client.totalGwpInr) * 100
      }
    })

    // Convert map to array
    const clients = Array.from(clientsMap.values())

    return { clients }
  } catch (error) {
    console.error("Error fetching commission report data:", error)
    return {
      error: `Failed to fetch commission report data: ${error instanceof Error ? error.message : String(error)}`,
      clients: [],
    }
  }
}
