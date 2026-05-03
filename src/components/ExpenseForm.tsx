import { useState, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { EXPENSE_CATEGORIES } from '../lib/types'
import type { ExpenseCategory } from '../lib/types'

interface ExpenseFormProps {
  careRecipientId: string
  userId: string
  onSaved: () => void
  onCancel: () => void
}

export function ExpenseForm({ careRecipientId, userId, onSaved, onCancel }: ExpenseFormProps) {
  const [amount, setAmount] = useState('')
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10))
  const [category, setCategory] = useState<ExpenseCategory | ''>('')
  const [vendor, setVendor] = useState('')
  const [notes, setNotes] = useState('')
  const [receiptFile, setReceiptFile] = useState<File | null>(null)
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const fileInputRef = useRef<HTMLInputElement>(null)

  const validate = (): Record<string, string> => {
    const errs: Record<string, string> = {}
    const parsed = parseFloat(amount)
    if (!amount || isNaN(parsed) || parsed <= 0) {
      errs.amount = 'Enter a valid amount greater than 0'
    } else if (!/^\d+(\.\d{1,2})?$/.test(amount.trim())) {
      errs.amount = 'Amount must have at most 2 decimal places'
    }
    if (!date) errs.date = 'Date is required'
    if (!category) errs.category = 'Select a category'
    if (!vendor.trim()) errs.vendor = 'Vendor is required'
    return errs
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const errs = validate()
    setErrors(errs)
    if (Object.keys(errs).length > 0) return

    setSaving(true)

    try {
      // Duplicate check: same amount + date + vendor within last 10 seconds
      const tenSecondsAgo = new Date(Date.now() - 10_000).toISOString()
      const { data: dupes } = await supabase
        .from('expenses')
        .select('id')
        .eq('care_recipient_id', careRecipientId)
        .eq('amount', parseFloat(amount))
        .eq('date', date)
        .eq('vendor', vendor.trim())
        .gte('created_at', tenSecondsAgo)
        .limit(1)

      if (dupes && dupes.length > 0) {
        setErrors({ form: 'Duplicate expense detected. Please wait before resubmitting.' })
        setSaving(false)
        return
      }

      let receipt_url: string | null = null

      if (receiptFile) {
        const ext = receiptFile.name.split('.').pop() ?? 'jpg'
        const path = `${userId}/${careRecipientId}/${crypto.randomUUID()}.${ext}`
        const { error: uploadError } = await supabase.storage
          .from('receipts')
          .upload(path, receiptFile, { contentType: receiptFile.type })

        if (uploadError) {
          setErrors({ form: `Receipt upload failed: ${uploadError.message}` })
          setSaving(false)
          return
        }

        const { data: urlData } = supabase.storage.from('receipts').getPublicUrl(path)
        receipt_url = urlData.publicUrl
      }

      const { error } = await supabase.from('expenses').insert({
        care_recipient_id: careRecipientId,
        amount: parseFloat(amount),
        date,
        category,
        vendor: vendor.trim(),
        notes: notes.trim() || null,
        receipt_url,
        created_by: userId,
      })

      if (error) {
        setErrors({ form: error.message })
      } else {
        onSaved()
      }
    } catch (err) {
      setErrors({ form: 'Something went wrong. Please try again.' })
    }

    setSaving(false)
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 mb-6 space-y-4">
      <h3 className="text-base font-semibold text-gray-900">Log expense</h3>

      {errors.form && (
        <div className="bg-red-50 text-red-700 text-sm rounded-lg p-3">{errors.form}</div>
      )}

      <div>
        <label htmlFor="amount" className="block text-sm font-medium text-gray-700 mb-1">
          Amount <span className="text-red-500">*</span>
        </label>
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
          <input
            id="amount"
            type="text"
            inputMode="decimal"
            value={amount}
            onChange={e => setAmount(e.target.value)}
            className={`w-full rounded-lg border px-3 py-2 pl-7 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent ${errors.amount ? 'border-red-400' : 'border-gray-300'}`}
            placeholder="0.00"
          />
        </div>
        {errors.amount && <p className="text-red-600 text-xs mt-1">{errors.amount}</p>}
      </div>

      <div>
        <label htmlFor="expense-date" className="block text-sm font-medium text-gray-700 mb-1">
          Date <span className="text-red-500">*</span>
        </label>
        <input
          id="expense-date"
          type="date"
          value={date}
          onChange={e => setDate(e.target.value)}
          className={`w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent ${errors.date ? 'border-red-400' : 'border-gray-300'}`}
        />
        {errors.date && <p className="text-red-600 text-xs mt-1">{errors.date}</p>}
      </div>

      <div>
        <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-1">
          Category <span className="text-red-500">*</span>
        </label>
        <select
          id="category"
          value={category}
          onChange={e => setCategory(e.target.value as ExpenseCategory)}
          className={`w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent ${errors.category ? 'border-red-400' : 'border-gray-300'}`}
        >
          <option value="">Select a category</option>
          {EXPENSE_CATEGORIES.map(c => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
        {errors.category && <p className="text-red-600 text-xs mt-1">{errors.category}</p>}
      </div>

      <div>
        <label htmlFor="vendor" className="block text-sm font-medium text-gray-700 mb-1">
          Vendor <span className="text-red-500">*</span>
        </label>
        <input
          id="vendor"
          type="text"
          value={vendor}
          onChange={e => setVendor(e.target.value)}
          className={`w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent ${errors.vendor ? 'border-red-400' : 'border-gray-300'}`}
          placeholder="e.g. CVS Pharmacy"
        />
        {errors.vendor && <p className="text-red-600 text-xs mt-1">{errors.vendor}</p>}
      </div>

      <div>
        <label htmlFor="expense-notes" className="block text-sm font-medium text-gray-700 mb-1">
          Notes
        </label>
        <textarea
          id="expense-notes"
          value={notes}
          onChange={e => setNotes(e.target.value)}
          rows={3}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
          placeholder="Optional details..."
        />
      </div>

      <div>
        <label htmlFor="receipt" className="block text-sm font-medium text-gray-700 mb-1">
          Receipt photo
        </label>
        <input
          id="receipt"
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={e => setReceiptFile(e.target.files?.[0] ?? null)}
          className="w-full text-sm text-gray-500 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-indigo-50 file:text-indigo-600 hover:file:bg-indigo-100"
        />
        {receiptFile && (
          <p className="text-xs text-gray-400 mt-1">{receiptFile.name}</p>
        )}
      </div>

      <div className="flex gap-3">
        <button
          type="submit"
          disabled={saving}
          className="flex-1 bg-indigo-600 text-white rounded-lg py-2.5 text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors"
        >
          {saving ? 'Saving...' : 'Save expense'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2.5 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
        >
          Cancel
        </button>
      </div>
    </form>
  )
}
