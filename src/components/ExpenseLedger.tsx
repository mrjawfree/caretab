import { useMemo, useState } from 'react'
import { EXPENSE_CATEGORIES } from '../lib/types'
import type { Expense, ExpenseCategory } from '../lib/types'
import { ExpenseDetail } from './ExpenseDetail'

interface ExpenseLedgerProps {
  expenses: Expense[]
  onLogExpense?: () => void
}

const formatCurrency = (n: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n)

function getAvailableYears(expenses: Expense[]): number[] {
  const years = new Set(expenses.map(e => new Date(e.date).getFullYear()))
  years.add(new Date().getFullYear())
  return Array.from(years).sort((a, b) => b - a)
}

export function ExpenseLedger({ expenses, onLogExpense }: ExpenseLedgerProps) {
  const currentYear = new Date().getFullYear()
  const [selectedYear, setSelectedYear] = useState(currentYear)
  const [selectedCategory, setSelectedCategory] = useState<ExpenseCategory | 'All'>('All')
  const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null)

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
      </div>

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
