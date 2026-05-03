import type { Expense } from '../lib/types'

interface ExpenseDetailProps {
  expense: Expense
  onClose: () => void
  formatCurrency: (n: number) => string
}

export function ExpenseDetail({ expense, onClose, formatCurrency }: ExpenseDetailProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="fixed inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white w-full sm:max-w-md sm:rounded-xl rounded-t-xl shadow-xl max-h-[85vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-5 py-3 flex items-center justify-between">
          <h3 className="font-semibold text-gray-900">Expense Detail</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 p-1"
            aria-label="Close"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-2xl font-bold text-gray-900">{formatCurrency(expense.amount)}</p>
              <p className="text-sm text-gray-500 mt-0.5">{expense.vendor}</p>
            </div>
            <span className="inline-block text-xs font-medium text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded">
              {expense.category}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-xs text-gray-400 uppercase tracking-wide">Date</p>
              <p className="text-sm text-gray-900 mt-0.5">
                {new Date(expense.date).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-400 uppercase tracking-wide">Category</p>
              <p className="text-sm text-gray-900 mt-0.5">{expense.category}</p>
            </div>
          </div>

          {expense.notes && (
            <div>
              <p className="text-xs text-gray-400 uppercase tracking-wide">Notes</p>
              <p className="text-sm text-gray-700 mt-1">{expense.notes}</p>
            </div>
          )}

          {expense.receipt_url && (
            <div>
              <p className="text-xs text-gray-400 uppercase tracking-wide mb-2">Receipt</p>
              <a
                href={expense.receipt_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-sm text-indigo-600 font-medium hover:underline"
              >
                <span>View receipt</span>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M11 3a1 1 0 100 2h2.586l-6.293 6.293a1 1 0 101.414 1.414L15 6.414V9a1 1 0 102 0V4a1 1 0 00-1-1h-5z" />
                  <path d="M5 5a2 2 0 00-2 2v8a2 2 0 002 2h8a2 2 0 002-2v-3a1 1 0 10-2 0v3H5V7h3a1 1 0 000-2H5z" />
                </svg>
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
