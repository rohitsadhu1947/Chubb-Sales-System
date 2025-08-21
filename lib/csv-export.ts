// Function to convert data to CSV format
export function convertToCSV(data: any[], headers: { key: string; label: string }[]): string {
  // Create header row
  const headerRow = headers.map((header) => `"${header.label}"`).join(",")

  // Create data rows
  const rows = data.map((item) => {
    return headers
      .map((header) => {
        const value = item[header.key]
        // Handle different types of values
        if (value === null || value === undefined) {
          return '""'
        } else if (typeof value === "string") {
          // Escape quotes in strings
          return `"${value.replace(/"/g, '""')}"`
        } else {
          return `"${value}"`
        }
      })
      .join(",")
  })

  // Combine header and rows
  return [headerRow, ...rows].join("\n")
}

// Function to download CSV
export function downloadCSV(csvContent: string, fileName: string): void {
  // Create a blob with the CSV content
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })

  // Create a link element
  const link = document.createElement("a")

  // Create a URL for the blob
  const url = URL.createObjectURL(blob)

  // Set link properties
  link.setAttribute("href", url)
  link.setAttribute("download", fileName)
  link.style.visibility = "hidden"

  // Append link to document
  document.body.appendChild(link)

  // Click the link to trigger download
  link.click()

  // Clean up
  document.body.removeChild(link)
}
