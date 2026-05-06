import { useState, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { EXPENSE_CATEGORIES } from '../lib/types'
import type { ExpenseCategory } from '../lib/types'
import { scanReceipt } from '../lib/ocr'
import type { OcrResult } from '../lib/ocr'

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
  const [reimbursed, setReimbursed] = useState(false)
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [scanning, setScanning] = useState(false)
  const [ocrResult, setOcrResult] = useState<OcrResult | null>(null)
  const [receiptPreview, setReceiptPreview] = useState<string | null>(null)
  const scanInputRef = useRef<HTMLInputElement>(null)

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

  const handleScanReceipt = async (file: File) => {
    setScanning(true)
    setOcrResult(null)
    setErrors({})
    setReceiptFile(file)

    const url = URL.createObjectURL(file)
    setReceiptPreview(url)

    try {
      const result = await scanReceipt(file)
      setOcrResult(result)

      if (result.amount) setAmount(result.amount)
      if (result.date) setDate(result.date)
      if (result.vendor) setVendor(result.vendor)
    } catch {
      setErrors({ ocr: 'Could not read receipt. You can still fill in the details manually.' })
    }

    setScanning(false)
  }

  const handleScanInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) handleScanReceipt(file)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const errs = validate()
    setErrors(errs)
    if (Object.keys(errs).length > 0) return

    setSaving(true)

    try {
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
        reimbursed,
        created_by: userId,
      })

      if (error) {
        setErrors({ form: error.message })
      } else {
        if (receiptPreview) URL.revokeObjectURL(receiptPreview)
        onSaved()
      }
    } catch {
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

      {/* Receipt scan section */}
      <div className="bg-indigo-50 rounded-lg p-4 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-indigo-900">Scan receipt to auto-fill</span>
          {ocrResult && !scanning && (
            <span className="text-xs text-indigo-600 font-medium">Fields updated</span>
          )}
        </div>

        <input
          ref={scanInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handleScanInputChange}
          className="hidden"
        />

        <div className="flex gap-2">
          <button
            type="button"
            disabled={scanning}
            onClick={() => scanInputRef.current?.click()}
            className="flex-1 inline-flex items-center justify-center gap-2 bg-indigo-600 text-white rounded-lg py-2 px-3 text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
              <path d="M1 8a2 2 0 0 1 2-2h.93a2 2 0 0 0 1.664-.89l.812-1.22A2 2 0 0 1 8.07 3h3.86a2 2 0 0 1 1.664.89l.812 1.22A2 2 0 0 0 16.07 6H17a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8Z" />
              <path d="M10 14.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z" />
            </svg>
            {scanning ? 'Scanning...' : 'Take photo'}
          </button>
          <button
            type="button"
            disabled={scanning}
            onClick={() => {
              if (scanInputRef.current) {
                scanInputRef.current.removeAttribute('capture')
                scanInputRef.current.click()
                setTimeout(() => scanInputRef.current?.setAttribute('capture', 'environment'), 100)
              }
            }}
            className="flex-1 inline-flex items-center justify-center gap-2 bg-white text-indigo-700 border border-indigo-300 rounded-lg py-2 px-3 text-sm font-medium hover:bg-indigo-50 disabled:opacity-50 transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
              <path fillRule="evenodd" d="M1 8a2 2 0 0 1 2-2h.93a2 2 0 0 0 1.664-.89l.812-1.22A2 2 0 0 1 8.07 3h3.86a2 2 0 0 1 1.664.89l.812 1.22A2 2 0 0 0 16.07 6H17a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8Zm12.5 3a3.5 3.5 0 1 1-7 0 3.5 3.5 0 0 1 7 0Z" clipRule="evenodd" />
            </svg>
            {scanning ? 'Scanning...' : 'Upload image'}
          </button>
        </div>

        {scanning && (
          <div className="flex items-center gap-2 text-sm text-indigo-700">
            <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            Reading receipt...
          </div>
        )}

        {errors.ocr && (
          <p className="text-sm text-amber-700 bg-amber-50 rounded p-2">{errors.ocr}</p>
        )}

        {receiptPreview && !scanning && (
          <div className="relative">
            <img
              src={receiptPreview}
              alt="Receipt preview"
              className="w-full max-h-32 object-cover rounded-lg border border-indigo-200"
            />
            {ocrResult && (
              <div className="mt-2 text-xs text-indigo-600 space-y-0.5">
                {ocrResult.amount && <p>Amount: ${ocrResult.amount}</p>}
                {ocrResult.date && <p>Date: {ocrResult.date}</p>}
                {ocrResult.vendor && <p>Vendor: {ocrResult.vendor}</p>}
                {!ocrResult.amount && !ocrResult.date && !ocrResult.vendor && (
                  <p className="text-amber-600">No fields detected — please fill in manually</p>
                )}
              </div>
            )}
          </div>
        )}
      </div>

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

      <div className="flex items-center justify-between">
        <label htmlFor="reimbursed" className="text-sm font-medium text-gray-700">
          Reimbursed
        </label>
        <button
          id="reimbursed"
          type="button"
          role="switch"
          aria-checked={reimbursed}
          onClick={() => setReimbursed(!reimbursed)}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${reimbursed ? 'bg-indigo-600' : 'bg-gray-200'}`}
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${reimbursed ? 'translate-x-6' : 'translate-x-1'}`}
          />
        </button>
      </div>

      {!receiptFile && (
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
        </div>
      )}
      {receiptFile && !receiptPreview && (
        <p className="text-xs text-gray-400">{receiptFile.name}</p>
      )}

      <div className="flex gap-3">
        <button
          type="submit"
          disabled={saving || scanning}
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
