"use client"

import { useState } from "react"
import { TableCell, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { ChevronDown, ChevronRight } from "lucide-react"

interface ClientData {
  id: string
  name: string
  totalGwpInr: number
  totalCommissionInr: number
  totalCdpFeeInr: number
  avgCommissionPct: number
  avgCdpFeePct: number
  details: DetailRow[]
}

interface DetailRow {
  productId: string
  productName: string
  brokerId: string
  brokerName: string
  channelType: string
  gwpInr: number
  commissionPct: number
  commissionInr: number
  cdpFeePct: number
  cdpFeeInr: number
}

interface ExpandableRowProps {
  client: ClientData
  formatCurrency: (value: number) => string
  formatPercent: (value: number) => string
}

export function ExpandableRow({ client, formatCurrency, formatPercent }: ExpandableRowProps) {
  const [isExpanded, setIsExpanded] = useState(false)

  return (
    <>
      {/* Client summary row */}
      <TableRow className="hover:bg-muted/50 cursor-pointer" onClick={() => setIsExpanded(!isExpanded)}>
        <TableCell className="font-medium">
          <div className="flex items-center">
            <Button variant="ghost" size="sm" className="p-0 h-6 w-6 mr-2">
              {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            </Button>
            {client.name}
          </div>
        </TableCell>
        <TableCell>All Products</TableCell>
        <TableCell>All Brokers</TableCell>
        <TableCell>All Channels</TableCell>
        <TableCell className="text-right">{formatCurrency(client.totalGwpInr)}</TableCell>
        <TableCell className="text-right">{formatPercent(client.avgCommissionPct)}</TableCell>
        <TableCell className="text-right">{formatCurrency(client.totalCommissionInr)}</TableCell>
        <TableCell className="text-right">{formatPercent(client.avgCdpFeePct)}</TableCell>
        <TableCell className="text-right">{formatCurrency(client.totalCdpFeeInr)}</TableCell>
      </TableRow>

      {/* Detail rows */}
      {isExpanded &&
        client.details.map((detail, index) => (
          <TableRow key={`${client.id}-${detail.productId}-${detail.brokerId}-${index}`} className="bg-muted/30">
            <TableCell className="pl-10">{client.name}</TableCell>
            <TableCell>{detail.productName}</TableCell>
            <TableCell>{detail.brokerName}</TableCell>
            <TableCell>{detail.channelType}</TableCell>
            <TableCell className="text-right">{formatCurrency(detail.gwpInr)}</TableCell>
            <TableCell className="text-right">{formatPercent(detail.commissionPct)}</TableCell>
            <TableCell className="text-right">{formatCurrency(detail.commissionInr)}</TableCell>
            <TableCell className="text-right">{formatPercent(detail.cdpFeePct)}</TableCell>
            <TableCell className="text-right">{formatCurrency(detail.cdpFeeInr)}</TableCell>
          </TableRow>
        ))}
    </>
  )
}
