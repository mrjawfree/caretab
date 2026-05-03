import { useMemo, useState } from 'react'
import { EXPENSE_CATEGORIES } from '../lib/types'
import type { Expense, ExpenseCategory } from '../lib/types'
import { ExpenseDetail } from './ExpenseDetail'
import { exportCSV, exportPDF } from '../lib/exportLedger'

interface ExpenseLedgerProps {
  expenses: Expense[]
  filerName: string
  onLogExpense?: () => void
}

const formatCurrency = (n: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n)

function getAvailableYears(expenses: Expense[]): number[] {
  const years = new Set(expenses.map(e => new Date(e.date).getFullYear()))
  years.add(new Date().getFullYear())
  return Array.from(years).sort((a, b) => b - a)
}

function toISODate(d: Date): string {
  return d.toISOString().split('T')[0]
}

function getEarliestYear(expenses: Expense[]): number {
  if (expenses.length === 0) return new Date().getFullYear()
  return expenses.reduce((min, e) => {
    const y = new Date(e.date).getFullYear()
    return y < min ? y : min
  }, new Date().getFullYear())
}

export function ExpenseLedger({ expenses, filerName, onLogExpense }: ExpenseLedgerProps) {
  const currentYear = new Date().getFullYear()
  const [selectedYear, setSelectedYear] = useState(currentYear)
  const [selectedCategory, setSelectedCategory] = useState<ExpenseCategory | 'All'>('All')
  const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null)
  const earliestYear = useMemo(() => getEarliestYear(expenses), [expenses])
  const [startDate, setStartDate] = useState(`${earliestYear}-01-01`)
  const [endDate, setEndDate] = useState(toISODate(new Date()))
  const [showExport, setShowExport] = useState(false)

  const availableYears = useMemo(() => getAvailableYears(expenses), [expenses])

  const filteredExpenses = useMemo(() => {
    return expenses.filter(e => {
      const year = new Date(e.date).getFullYear()
      if (year !== selectedYear) return false
      if (selectedCategory !== 'All' && e.category !== selectedCategory) return false
      return true
    })
  }, [expenses, selectedYear, selectedCategory])

  const ytdTotal = useMemo(() => {
    return expenses
      .filter(e => new Date(e.date).getFullYear() === selectedYear)
      .reduce((sum, e) => sum + e.amount, 0)
  }, [expenses, selectedYear])

  const exportExpenses = useMemo(() => {
    return expenses
      .filter(e => {
        if (e.date < startDate || e.date > endDate) return false
        if (selectedCategory !== 'All' && e.category !== selectedCategory) return false
        return true
      })
      .sort((a, b) => a.date.localeCompare(b.date))
  }, [expenses, startDate, endDate, selectedCategory])

  const exportTotal = useMemo(
    () => exportExpenses.reduce((sum, e) => sum + e.amount, 0),
    [exportExpenses],
  )

  const groupedExpenses = useMemo(() => {
    const groups: Record<string, { expenses: Expense[]; subtotal: number }> = {}
    for (const cat of EXPENSE_CATEGORIES) {
      const catExpenses = filteredExpenses.filter(e => e.category === cat)
      if (catExpenses.length > 0) {
        groups[cat] = {
          expenses: catExpenses,
          subtotal: catExpenses.reduce((sum, e) => sum + e.amount, 0),
        }
      }
    }
    return groups
  }, [filteredExpenses])

  const exportYears = useMemo(() => {
    const years = new Set(exportExpenses.map(e => new Date(e.date).getFullYear()))
    return Array.from(years).sort((a, b) => a - b)
  }, [exportExpenses])

  const [exporting, setExporting] = useState(false)

  const handleExport = async (format: 'pdf' | 'csv') => {
    if (exportExpenses.length === 0) return
    const opts = {
      expenses: exportExpenses,
      filerName,
      startDate,
      endDate,
      totalAmount: exportTotal,
      spansMultipleYears: exportYears.length > 1,
    }
    if (format === 'pdf') {
      setExporting(true)
      try {
        await exportPDF(opts)
      } finally {
        setExporting(false)
      }
    } else {
      exportCSV(opts)
    }
  }

  if (expenses.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-400 mb-2">No expenses logged yet</p>
        {onLogExpense && (
          <button
            onClick={onLogExpense}
            className="mt-3 bg-indigo-600 text-white text-sm font-medium rounded-lg px-5 py-2.5 hover:bg-indigo-700 transition-colors"
          >
            Log first expense
          </button>
        )}
      </div>
    )
  }

  return (
    <div>
      <div className="bg-indigo-50 rounded-xl p-4 mb-4">
        <p className="text-xs text-indigo-500 uppercase tracking-wide font-medium">
          {selectedYear} Total
        </p>
        <p className="text-2xl font-bold text-indigo-700 mt-1">{formatCurrency(ytdTotal)}</p>
      </div>

      <div className="flex gap-3 mb-5">
        <select
          value={selectedYear}
          onChange={e => setSelectedYear(Number(e.target.value))}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          aria-label="Filter by year"
        >
          {availableYears.map(y => (
            <option key={y} value={y}>{y}</option>
          ))}
        </select>
        <select
          value={selectedCategory}
          onChange={e => setSelectedCategory(e.target.value as ExpenseCategory | 'All')}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent flex-1"
          aria-label="Filter by category"
        >
          <option value="All">All categories</option>
          {EXPENSE_CATEGORIES.map(c => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
        <button
          onClick={() => setShowExport(v => !v)}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 transition-colors"
          aria-label="Export ledger"
          title="Export"
        >
          ↓ Export
        </button>
      </div>

      {showExport && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-5">
          <h4 className="text-sm font-semibold text-gray-700 mb-3">Export Ledger</h4>
          <div className="flex gap-3 mb-3">
            <div className="flex-1">
              <label className="block text-xs text-gray-500 mb-1">Start date</label>
              <input
                type="date"
                value={startDate}
                onChange={e => setStartDate(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>
            <div className="flex-1">
              <label className="block text-xs text-gray-500 mb-1">End date</label>
              <input
                type="date"
                value={endDate}
                onChange={e => setEndDate(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>
          </div>
          {startDate > endDate && (
            <p className="text-xs text-red-500 mb-3">Start date must be before end date.</p>
          )}
          <p className="text-xs text-gray-500 mb-3">
            {exportExpenses.length} expense{exportExpenses.length !== 1 ? 's' : ''} · {formatCurrency(exportTotal)}
            {selectedCategory !== 'All' && ` · ${selectedCategory} only`}
          </p>
          {exportExpenses.length === 0 ? (
            <p className="text-sm text-gray-400">No expenses found for this date range{selectedCategory !== 'All' ? ` and category` : ''}.</p>
          ) : (
            <div className="flex gap-3">
              <button
                onClick={() => handleExport('pdf')}
                disabled={startDate > endDate || exporting}
                className="flex-1 bg-indigo-600 text-white text-sm font-medium rounded-lg px-4 py-2.5 hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {exporting ? 'Preparing…' : 'Download PDF'}
              </button>
              <button
                onClick={() => handleExport('csv')}
                disabled={startDate > endDate}
                className="flex-1 bg-gray-100 text-gray-700 text-sm font-medium rounded-lg px-4 py-2.5 hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Download CSV
              </button>
            </div>
          )}
        </div>
      )}

      {filteredExpenses.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-gray-400">No expenses match the current filters</p>
        </div>
      ) : (
        <div className="space-y-5">
          {Object.entries(groupedExpenses).map(([category, { expenses: catExpenses, subtotal }]) => (
            <div key={category}>
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-sm font-semibold text-gray-700">{category}</h4>
                <span className="text-sm font-medium text-gray-500">{formatCurrency(subtotal)}</span>
              </div>
              <div className="space-y-2">
                {catExpenses.map(exp => (
                  <button
                    key={exp.id}
                    onClick={() => setSelectedExpense(exp)}
                    className="w-full text-left bg-white rounded-xl shadow-sm border border-gray-200 p-3.5 hover:border-indigo-300 hover:shadow-md transition-all"
                  >
                    <div className="flex items-center justify-between">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium text-gray-900 truncate">{exp.vendor}</p>
                          {exp.receipt_url && (
                            <span className="text-xs flex-shrink-0" title="Receipt attached">
                              📎
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                          <p className="text-xs text-gray-400">
                            {new Date(exp.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                          </p>
                          {exp.notes && (
                            <p className="text-xs text-gray-400 truncate">
                              — {exp.notes}
                            </p>
                          )}
                        </div>
                      </div>
                      <p className="text-sm font-semibold text-gray-900 ml-3 flex-shrink-0">
                        {formatCurrency(exp.amount)}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {selectedExpense && (
        <ExpenseDetail
          expense={selectedExpense}
          onClose={() => setSelectedExpense(null)}
          formatCurrency={formatCurrency}
        />
      )}
    </div>
  )
}
