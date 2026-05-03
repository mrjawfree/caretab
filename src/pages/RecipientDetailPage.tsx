import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { ExpenseForm } from '../components/ExpenseForm'
import type { CareRecipient, Expense } from '../lib/types'
import type { User } from '@supabase/supabase-js'

interface RecipientDetailPageProps {
  user: User
  onSignOut: () => void
}

export function RecipientDetailPage({ user, onSignOut }: RecipientDetailPageProps) {
  const { recipientId } = useParams<{ recipientId: string }>()
  const navigate = useNavigate()
  const [recipient, setRecipient] = useState<CareRecipient | null>(null)
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [confirmation, setConfirmation] = useState(false)

  const fetchData = async () => {
    if (!recipientId) return

    const [recipientRes, expensesRes] = await Promise.all([
      supabase
        .from('care_recipients')
        .select('*')
        .eq('id', recipientId)
        .eq('owner_user_id', user.id)
        .single(),
      supabase
        .from('expenses')
        .select('*')
        .eq('care_recipient_id', recipientId)
        .order('date', { ascending: false }),
    ])

    if (recipientRes.data) setRecipient(recipientRes.data)
    if (expensesRes.data) setExpenses(expensesRes.data)
    setLoading(false)
  }

  useEffect(() => {
    fetchData()
  }, [recipientId, user.id])

  const handleExpenseSaved = () => {
    setShowForm(false)
    setConfirmation(true)
    setTimeout(() => setConfirmation(false), 3000)
    fetchData()
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-gray-400">Loading...</p>
      </div>
    )
  }

  if (!recipient) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <p className="text-gray-500 mb-4">Recipient not found</p>
          <button onClick={() => navigate('/')} className="text-indigo-600 font-medium hover:underline">
            Back to home
          </button>
        </div>
      </div>
    )
  }

  const formatCurrency = (n: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n)

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/')}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            aria-label="Back to home"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
            </svg>
          </button>
          <h1 className="text-xl font-bold text-indigo-600">CareTab</h1>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-500 hidden sm:inline">{user.email}</span>
          <button onClick={onSignOut} className="text-sm text-gray-500 hover:text-gray-700 font-medium">
            Sign out
          </button>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-6">
          <h2 className="text-lg font-semibold text-gray-900">{recipient.name}</h2>
          {recipient.relationship && (
            <p className="text-sm text-gray-500 mt-0.5">{recipient.relationship}</p>
          )}
          {recipient.date_of_birth && (
            <p className="text-xs text-gray-400 mt-1">
              DOB: {new Date(recipient.date_of_birth).toLocaleDateString()}
            </p>
          )}
          {recipient.notes && (
            <p className="text-sm text-gray-600 mt-2 border-t border-gray-100 pt-2">{recipient.notes}</p>
          )}
        </div>

        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-semibold text-gray-900">Expenses</h3>
          {!showForm && (
            <button
              onClick={() => setShowForm(true)}
              className="bg-indigo-600 text-white text-sm font-medium rounded-lg px-4 py-2 hover:bg-indigo-700 transition-colors"
            >
              + Log expense
            </button>
          )}
        </div>

        {confirmation && (
          <div className="bg-green-50 text-green-700 text-sm rounded-lg p-3 mb-4">
            Expense saved successfully.
          </div>
        )}

        {showForm && (
          <ExpenseForm
            careRecipientId={recipient.id}
            userId={user.id}
            onSaved={handleExpenseSaved}
            onCancel={() => setShowForm(false)}
          />
        )}

        {expenses.length === 0 && !showForm ? (
          <div className="text-center py-12">
            <p className="text-gray-400 mb-2">No expenses yet</p>
            <p className="text-sm text-gray-400">Log your first expense to start tracking</p>
          </div>
        ) : (
          <div className="space-y-3">
            {expenses.map(exp => (
              <div key={exp.id} className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-semibold text-gray-900">{formatCurrency(exp.amount)}</p>
                    <p className="text-sm text-gray-500">{exp.vendor}</p>
                  </div>
                  <div className="text-right">
                    <span className="inline-block text-xs font-medium text-indigo-600 bg-indigo-50 px-2 py-1 rounded">
                      {exp.category}
                    </span>
                    <p className="text-xs text-gray-400 mt-1">
                      {new Date(exp.date).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                {exp.notes && (
                  <p className="text-sm text-gray-600 mt-2 border-t border-gray-100 pt-2">{exp.notes}</p>
                )}
                {exp.receipt_url && (
                  <a
                    href={exp.receipt_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-block text-xs text-indigo-600 hover:underline mt-2"
                  >
                    View receipt
                  </a>
                )}
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
