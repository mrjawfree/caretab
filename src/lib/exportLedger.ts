import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import type { Expense } from './types'

interface ExportOptions {
  expenses: Expense[]
  filerName: string
  startDate: string
  endDate: string
  totalAmount: number
  spansMultipleYears?: boolean
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

export function exportCSV({ expenses, filerName, startDate, endDate, totalAmount, spansMultipleYears }: ExportOptions) {
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
    ...(spansMultipleYears ? ['# Note: Export spans multiple plan years'] : []),
    '',
    headers.map(escapeCsv).join(','),
    ...rows.map(row => row.map(escapeCsv).join(',')),
  ]

  const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' })
  triggerDownload(blob, buildFilename(startDate, endDate, 'csv'))
}

async function fetchImageAsDataUrl(url: string): Promise<string | null> {
  try {
    const res = await fetch(url)
    if (!res.ok) return null
    const blob = await res.blob()
    return new Promise(resolve => {
      const reader = new FileReader()
      reader.onloadend = () => resolve(reader.result as string)
      reader.onerror = () => resolve(null)
      reader.readAsDataURL(blob)
    })
  } catch {
    return null
  }
}

function groupExpensesByYear(expenses: Expense[]): Map<number, Expense[]> {
  const groups = new Map<number, Expense[]>()
  for (const e of expenses) {
    const year = new Date(e.date).getFullYear()
    const list = groups.get(year) ?? []
    list.push(e)
    groups.set(year, list)
  }
  return new Map([...groups.entries()].sort(([a], [b]) => a - b))
}

export async function exportPDF({ expenses, filerName, startDate, endDate, totalAmount, spansMultipleYears }: ExportOptions) {
  const receiptUrls = expenses.map(e => e.receipt_url).filter(Boolean) as string[]
  const imageCache = new Map<string, string>()
  const imageResults = await Promise.allSettled(
    receiptUrls.map(async url => {
      const dataUrl = await fetchImageAsDataUrl(url)
      if (dataUrl) imageCache.set(url, dataUrl)
    }),
  )
  void imageResults

  const doc = new jsPDF()

  doc.setFontSize(18)
  doc.setTextColor(55, 48, 163)
  doc.text('CareTab Ledger', 14, 20)

  doc.setFontSize(11)
  doc.setTextColor(60, 60, 60)
  doc.text(`Filer: ${filerName}`, 14, 30)
  doc.text(`Date Range: ${formatDate(startDate)} – ${formatDate(endDate)}`, 14, 37)

  let headerY = 47
  if (spansMultipleYears) {
    doc.setFontSize(10)
    doc.setTextColor(180, 130, 20)
    doc.text('Export spans multiple plan years', 14, 44)
    headerY = 51
  }

  doc.setFontSize(14)
  doc.setTextColor(55, 48, 163)
  doc.text(`Total: ${formatCurrency(totalAmount)}`, 14, headerY)

  doc.setDrawColor(200, 200, 200)
  doc.line(14, headerY + 4, 196, headerY + 4)

  const hasAnyReceipts = expenses.some(e => e.receipt_url && imageCache.has(e.receipt_url))
  let currentY = headerY + 9

  if (spansMultipleYears) {
    const yearGroups = groupExpensesByYear(expenses)

    for (const [year, yearExpenses] of yearGroups) {
      const yearTotal = yearExpenses.reduce((sum, e) => sum + e.amount, 0)

      doc.setFontSize(12)
      doc.setTextColor(55, 48, 163)
      doc.text(`${year}`, 14, currentY)
      doc.setFontSize(10)
      doc.setTextColor(100, 100, 100)
      doc.text(`  —  ${formatCurrency(yearTotal)}`, 14 + doc.getTextWidth(`${year}`), currentY)
      currentY += 5

      const tableRows = yearExpenses.map(e => [
        formatDate(e.date),
        e.vendor,
        e.category,
        formatCurrency(e.amount),
        e.notes ?? '—',
        '',
      ])

      autoTable(doc, {
        startY: currentY,
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
          5: { cellWidth: hasAnyReceipts ? 20 : 12 },
        },
        didDrawCell(data) {
          if (data.section !== 'body' || data.column.index !== 5) return
          const expense = yearExpenses[data.row.index]
          if (!expense?.receipt_url) {
            doc.setFontSize(9)
            doc.setTextColor(160, 160, 160)
            doc.text('—', data.cell.x + 2, data.cell.y + data.cell.height / 2 + 3)
            return
          }
          const dataUrl = imageCache.get(expense.receipt_url)
          if (dataUrl) {
            const imgSize = Math.min(data.cell.height - 2, 16)
            const x = data.cell.x + 2
            const y = data.cell.y + (data.cell.height - imgSize) / 2
            try {
              doc.addImage(dataUrl, x, y, imgSize, imgSize)
            } catch {
              doc.setFontSize(7)
              doc.setTextColor(100, 100, 100)
              doc.text('img', data.cell.x + 2, data.cell.y + data.cell.height / 2 + 2)
            }
          } else {
            doc.setFontSize(7)
            doc.setTextColor(100, 100, 100)
            doc.text('receipt', data.cell.x + 2, data.cell.y + data.cell.height / 2 + 2)
          }
        },
      })

      currentY = (doc as any).lastAutoTable.finalY + 10
    }
  } else {
    const tableRows = expenses.map(e => [
      formatDate(e.date),
      e.vendor,
      e.category,
      formatCurrency(e.amount),
      e.notes ?? '—',
      '',
    ])

    autoTable(doc, {
      startY: currentY,
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
        5: { cellWidth: hasAnyReceipts ? 20 : 12 },
      },
      didDrawCell(data) {
        if (data.section !== 'body' || data.column.index !== 5) return
        const expense = expenses[data.row.index]
        if (!expense?.receipt_url) {
          doc.setFontSize(9)
          doc.setTextColor(160, 160, 160)
          doc.text('—', data.cell.x + 2, data.cell.y + data.cell.height / 2 + 3)
          return
        }
        const dataUrl = imageCache.get(expense.receipt_url)
        if (dataUrl) {
          const imgSize = Math.min(data.cell.height - 2, 16)
          const x = data.cell.x + 2
          const y = data.cell.y + (data.cell.height - imgSize) / 2
          try {
            doc.addImage(dataUrl, x, y, imgSize, imgSize)
          } catch {
            doc.setFontSize(7)
            doc.setTextColor(100, 100, 100)
            doc.text('img', data.cell.x + 2, data.cell.y + data.cell.height / 2 + 2)
          }
        } else {
          doc.setFontSize(7)
          doc.setTextColor(100, 100, 100)
          doc.text('receipt', data.cell.x + 2, data.cell.y + data.cell.height / 2 + 2)
        }
      },
    })
  }

  doc.save(buildFilename(startDate, endDate, 'pdf'))
}
