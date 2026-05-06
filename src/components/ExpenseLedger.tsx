import { useMemo, useState, useRef, useEffect } from 'react'
import { ALL_EXPENSE_CATEGORIES, CATEGORY_ICONS } from '../lib/types'
import type { Expense, ExpenseCategory, ReimbursementFilter } from '../lib/types'
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
  const [selectedCategories, setSelectedCategories] = useState<Set<ExpenseCategory>>(new Set())
  const [showCategoryFilter, setShowCategoryFilter] = useState(false)
  const categoryFilterRef = useRef<HTMLDivElement>(null)
  const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null)
  const earliestYear = useMemo(() => getEarliestYear(expenses), [expenses])
  const [startDate, setStartDate] = useState(`${earliestYear}-01-01`)
  const [endDate, setEndDate] = useState(toISODate(new Date()))
  const [showExport, setShowExport] = useState(false)
  const [reimbursementFilter, setReimbursementFilter] = useState<ReimbursementFilter>('All')

  const availableYears = useMemo(() => getAvailableYears(expenses), [expenses])

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (categoryFilterRef.current && !categoryFilterRef.current.contains(e.target as Node)) {
        setShowCategoryFilter(false)
      }
    }
    if (showCategoryFilter) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showCategoryFilter])

  const toggleCategory = (cat: ExpenseCategory) => {
    setSelectedCategories(prev => {
      const next = new Set(prev)
      if (next.has(cat)) next.delete(cat)
      else next.add(cat)
      return next
    })
  }

  const filteredExpenses = useMemo(() => {
    return expenses.filter(e => {
      const year = new Date(e.date).getFullYear()
      if (year !== selectedYear) return false
      if (selectedCategories.size > 0 && !selectedCategories.has(e.category)) return false
      return true
    })
  }, [expenses, selectedYear, selectedCategories])

  const ytdTotal = useMemo(() => {
    return expenses
      .filter(e => new Date(e.date).getFullYear() === selectedYear)
      .reduce((sum, e) => sum + e.amount, 0)
  }, [expenses, selectedYear])

  const exportExpenses = useMemo(() => {
    return expenses
      .filter(e => {
        if (e.date < startDate || e.date > endDate) return false
        if (selectedCategories.size > 0 && !selectedCategories.has(e.category)) return false
        if (reimbursementFilter === 'Reimbursed' && !e.reimbursed) return false
        if (reimbursementFilter === 'Unreimbursed' && e.reimbursed) return false
        return true
      })
      .sort((a, b) => a.date.localeCompare(b.date))
  }, [expenses, startDate, endDate, selectedCategories, reimbursementFilter])

  const exportTotal = useMemo(
    () => exportExpenses.reduce((sum, e) => sum + e.amount, 0),
    [exportExpenses],
  )

  const groupedExpenses = useMemo(() => {
    const groups: Record<string, { expenses: Expense[]; subtotal: number }> = {}
    for (const cat of ALL_EXPENSE_CATEGORIES) {
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
      reimbursementFilter,
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
        <p className="text-gray-400 mb-2">No expenses yet</p>
        {onLogExpense && (
          <button
            onClick={onLogExpense}
            className="mt-3 bg-indigo-600 text-white text-sm font-medium rounded-lg px-5 py-2.5 hover:bg-indigo-700 transition-colors"
          >
            Add your first expense
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
        <div className="relative flex-1" ref={categoryFilterRef}>
          <button
            onClick={() => setShowCategoryFilter(v => !v)}
            className={`w-full rounded-lg border px-3 py-2 text-sm text-left focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent ${selectedCategories.size > 0 ? 'border-indigo-400 bg-indigo-50 text-indigo-700' : 'border-gray-300 text-gray-700'}`}
            aria-label="Filter by category"
          >
            {selectedCategories.size === 0
              ? 'All categories'
              : selectedCategories.size === 1
                ? `${CATEGORY_ICONS[[...selectedCategories][0]]} ${[...selectedCategories][0]}`
                : `${selectedCategories.size} categories`}
          </button>
          {showCategoryFilter && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-lg border border-gray-200 shadow-lg z-20 py-1">
              {ALL_EXPENSE_CATEGORIES.map(cat => (
                <label
                  key={cat}
                  className="flex items-center gap-2.5 px-3 py-2 hover:bg-gray-50 cursor-pointer text-sm"
                >
                  <input
                    type="checkbox"
                    checked={selectedCategories.has(cat)}
                    onChange={() => toggleCategory(cat)}
                    className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  <span>{CATEGORY_ICONS[cat]}</span>
                  <span>{cat}</span>
                </label>
              ))}
              {selectedCategories.size > 0 && (
                <button
                  onClick={() => setSelectedCategories(new Set())}
                  className="w-full text-left px-3 py-2 text-xs text-indigo-600 hover:bg-gray-50 border-t border-gray-100"
                >
                  Clear filters
                </button>
              )}
            </div>
          )}
        </div>
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
          <div className="mb-3">
            <label className="block text-xs text-gray-500 mb-1">Reimbursement status</label>
            <select
              value={reimbursementFilter}
              onChange={e => setReimbursementFilter(e.target.value as ReimbursementFilter)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              aria-label="Filter by reimbursement status"
            >
              <option value="All">All</option>
              <option value="Reimbursed">Reimbursed only</option>
              <option value="Unreimbursed">Unreimbursed only</option>
            </select>
          </div>
          {startDate > endDate && (
            <p className="text-xs text-red-500 mb-3">Start date must be before end date.</p>
          )}
          <p className="text-xs text-gray-500 mb-3">
            {exportExpenses.length} expense{exportExpenses.length !== 1 ? 's' : ''} · {formatCurrency(exportTotal)}
            {selectedCategories.size > 0 && ` · ${[...selectedCategories].join(', ')}`}
            {reimbursementFilter !== 'All' && ` · ${reimbursementFilter} only`}
          </p>
          {exportExpenses.length === 0 ? (
            <p className="text-sm text-gray-400">No expenses found for this date range{selectedCategories.size > 0 ? ' and selected categories' : ''}.</p>
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
                          <span className="text-xs text-[#4A7FA5] bg-[#4A7FA5]/10 px-1.5 py-0.5 rounded font-medium">
                            {CATEGORY_ICONS[exp.category]} {exp.category}
                          </span>
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
