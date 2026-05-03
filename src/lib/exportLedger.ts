import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import type { Expense } from './types'

interface ExportOptions {
  expenses: Expense[]
  filerName: string
  startDate: string
  endDate: string
  totalAmount: number
}

function buildFilename(startDate: string, endDate: string, ext: string): string {
  return `caretab-ledger-${startDate}-to-${endDate}.${ext}`
}

function formatDate(dateStr: string): string {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

function formatCurrency(n: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n)
}

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

export function exportCSV({ expenses, filerName, startDate, endDate, totalAmount }: ExportOptions) {
  const headers = ['Date', 'Vendor', 'Category', 'Amount', 'Notes', 'Receipt URL']
  const rows = expenses.map(e => [
    e.date,
    e.vendor,
    e.category,
    e.amount.toFixed(2),
    e.notes ?? '',
    e.receipt_url ?? '',
  ])

  const escapeCsv = (val: string) => {
    if (val.includes(',') || val.includes('"') || val.includes('\n')) {
      return `"${val.replace(/"/g, '""')}"`
    }
    return val
  }

  const lines = [
    `# CareTab Ledger Export — ${filerName}`,
    `# Date Range: ${formatDate(startDate)} – ${formatDate(endDate)}`,
    `# Total: ${formatCurrency(totalAmount)}`,
    '',
    headers.map(escapeCsv).join(','),
    ...rows.map(row => row.map(escapeCsv).join(',')),
  ]

  const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' })
  triggerDownload(blob, buildFilename(startDate, endDate, 'csv'))
}

export function exportPDF({ expenses, filerName, startDate, endDate, totalAmount }: ExportOptions) {
  const doc = new jsPDF()

  doc.setFontSize(18)
  doc.setTextColor(55, 48, 163)
  doc.text('CareTab Ledger', 14, 20)

  doc.setFontSize(11)
  doc.setTextColor(60, 60, 60)
  doc.text(`Filer: ${filerName}`, 14, 30)
  doc.text(`Date Range: ${formatDate(startDate)} – ${formatDate(endDate)}`, 14, 37)

  doc.setFontSize(14)
  doc.setTextColor(55, 48, 163)
  doc.text(`Total: ${formatCurrency(totalAmount)}`, 14, 47)

  doc.setDrawColor(200, 200, 200)
  doc.line(14, 51, 196, 51)

  const tableRows = expenses.map(e => [
    formatDate(e.date),
    e.vendor,
    e.category,
    formatCurrency(e.amount),
    e.notes ?? '—',
    e.receipt_url ? 'Yes' : '—',
  ])

  autoTable(doc, {
    startY: 56,
    head: [['Date', 'Vendor', 'Category', 'Amount', 'Notes', 'Receipt']],
    body: tableRows,
    styles: { fontSize: 9, cellPadding: 3 },
    headStyles: {
      fillColor: [79, 70, 229],
      textColor: 255,
      fontStyle: 'bold',
    },
    alternateRowStyles: { fillColor: [245, 243, 255] },
    columnStyles: {
      3: { halign: 'right' },
      4: { cellWidth: 40 },
    },
  })

  doc.save(buildFilename(startDate, endDate, 'pdf'))
}
