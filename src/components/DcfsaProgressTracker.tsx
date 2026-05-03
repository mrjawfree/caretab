import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import type { Expense } from '../lib/types'

interface DcfsaSettings {
  id: string
  care_recipient_id: string
  annual_cap: number
  benefit_year_start_month: number
}

interface DcfsaProgressTrackerProps {
  careRecipientId: string
  expenses: Expense[]
  isOwner: boolean
}

function getBenefitYearRange(startMonth: number): { start: string; end: string } {
  const now = new Date()
  const currentYear = now.getFullYear()
  const currentMonth = now.getMonth() + 1

  let yearStart: Date
  let yearEnd: Date

  if (currentMonth >= startMonth) {
    yearStart = new Date(currentYear, startMonth - 1, 1)
    yearEnd = new Date(currentYear + 1, startMonth - 1, 0)
  } else {
    yearStart = new Date(currentYear - 1, startMonth - 1, 1)
    yearEnd = new Date(currentYear, startMonth - 1, 0)
  }

  const fmt = (d: Date) => d.toISOString().split('T')[0]
  return { start: fmt(yearStart), end: fmt(yearEnd) }
}

export function DcfsaProgressTracker({ careRecipientId, expenses, isOwner }: DcfsaProgressTrackerProps) {
  const [settings, setSettings] = useState<DcfsaSettings | null>(null)
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [capInput, setCapInput] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchSettings = useCallback(async () => {
    const { data } = await supabase
      .from('dcfsa_settings')
      .select('*')
      .eq('care_recipient_id', careRecipientId)
      .maybeSingle()

    if (data) {
      setSettings(data)
    } else {
      setSettings({
        id: '',
        care_recipient_id: careRecipientId,
        annual_cap: 3000,
        benefit_year_start_month: 1,
      })
    }
    setLoading(false)
  }, [careRecipientId])

  useEffect(() => {
    fetchSettings()
  }, [fetchSettings])

  const startMonth = settings?.benefit_year_start_month ?? 1
  const annualCap = settings?.annual_cap ?? 3000
  const { start, end } = getBenefitYearRange(startMonth)

  const ytdTotal = expenses
    .filter(e => e.date >= start && e.date <= end)
    .reduce((sum, e) => sum + Number(e.amount), 0)

  const percentage = annualCap > 0 ? Math.min((ytdTotal / annualCap) * 100, 100) : 0
  const remaining = Math.max(annualCap - ytdTotal, 0)

  let barColor = 'bg-indigo-500'
  let statusText = ''
  if (percentage >= 100) {
    barColor = 'bg-red-500'
    statusText = 'Cap reached'
  } else if (percentage >= 80) {
    barColor = 'bg-amber-500'
    statusText = 'Approaching cap'
  }

  const handleSaveCap = async () => {
    const parsed = parseFloat(capInput)
    if (isNaN(parsed) || parsed < 0) {
      setError('Enter a valid amount')
      return
    }

    setSaving(true)
    setError(null)

    if (settings?.id) {
      const { error: err } = await supabase
        .from('dcfsa_settings')
        .update({ annual_cap: parsed })
        .eq('id', settings.id)

      if (err) {
        setError(err.message)
      } else {
        setSettings({ ...settings, annual_cap: parsed })
        setEditing(false)
      }
    } else {
      const { data, error: err } = await supabase
        .from('dcfsa_settings')
        .insert({ care_recipient_id: careRecipientId, annual_cap: parsed })
        .select()
        .single()

      if (err) {
        setError(err.message)
      } else if (data) {
        setSettings(data)
        setEditing(false)
      }
    }
    setSaving(false)
  }

  if (loading) return null

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-6">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-base font-semibold text-gray-900">DCFSA Progress</h3>
        {isOwner && !editing && (
          <button
            onClick={() => { setCapInput(annualCap.toString()); setEditing(true); setError(null) }}
            className="text-xs text-indigo-600 font-medium hover:text-indigo-700"
          >
            Edit cap
          </button>
        )}
      </div>

      {editing && (
        <div className="mb-3">
          <label className="block text-xs font-medium text-gray-600 mb-1">Annual cap ($)</label>
          <div className="flex gap-2">
            <input
              type="text"
              inputMode="decimal"
              value={capInput}
              onChange={e => setCapInput(e.target.value)}
              className="flex-1 rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
            <button
              onClick={handleSaveCap}
              disabled={saving}
              className="px-3 py-1.5 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50"
            >
              {saving ? '...' : 'Save'}
            </button>
            <button
              onClick={() => { setEditing(false); setError(null) }}
              className="px-3 py-1.5 text-sm font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200"
            >
              Cancel
            </button>
          </div>
          {error && <p className="text-xs text-red-600 mt-1">{error}</p>}
        </div>
      )}

      <div className="flex items-baseline justify-between mb-1.5">
        <span className="text-2xl font-bold text-gray-900">
          ${ytdTotal.toFixed(2)}
        </span>
        <span className="text-sm text-gray-500">
          of ${annualCap.toFixed(2)}
        </span>
      </div>

      <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden mb-2">
        <div
          className={`h-full rounded-full transition-all duration-300 ${barColor}`}
          style={{ width: `${percentage}%` }}
        />
      </div>

      <div className="flex items-center justify-between text-xs">
        <span className="text-gray-500">
          {percentage.toFixed(2)}% used
        </span>
        {statusText ? (
          <span className={`font-medium ${percentage >= 100 ? 'text-red-600' : 'text-amber-600'}`}>
            {statusText}
          </span>
        ) : (
          <span className="text-gray-500">
            ${remaining.toFixed(2)} remaining
          </span>
        )}
      </div>

      <p className="text-xs text-gray-400 mt-2">
        Benefit year: {new Date(start + 'T00:00').toLocaleDateString()} – {new Date(end + 'T00:00').toLocaleDateString()}
      </p>
    </div>
  )
}
