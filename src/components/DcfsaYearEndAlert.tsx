import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { trackYearEndAlertShown, trackYearEndAlertDismissed, trackYearEndNotificationSent } from '../lib/analytics'
import type { Expense } from '../lib/types'

interface DcfsaYearEndAlertProps {
  careRecipientId: string
  expenses: Expense[]
  onAddExpense?: () => void
}

function getDaysUntilYearEnd(): number {
  const now = new Date()
  const yearEnd = new Date(now.getFullYear(), 11, 31)
  const diff = yearEnd.getTime() - now.getTime()
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)))
}

function isInAlertWindow(): boolean {
  const month = new Date().getMonth()
  return month >= 9
}

function getSessionDismissKey(careRecipientId: string): string {
  return `dcfsa_year_end_alert_dismissed_${careRecipientId}`
}

export function DcfsaYearEndAlert({ careRecipientId, expenses, onAddExpense }: DcfsaYearEndAlertProps) {
  const [dismissed, setDismissed] = useState(() =>
    sessionStorage.getItem(getSessionDismissKey(careRecipientId)) === '1'
  )
  const [annualCap, setAnnualCap] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [notificationState, setNotificationState] = useState<'idle' | 'requesting' | 'sent' | 'denied'>('idle')
  const trackedRef = useRef(false)

  useEffect(() => {
    async function fetchCap() {
      const { data } = await supabase
        .from('dcfsa_settings')
        .select('annual_cap')
        .eq('care_recipient_id', careRecipientId)
        .maybeSingle()

      setAnnualCap(data?.annual_cap ?? 3000)
      setLoading(false)
    }
    fetchCap()
  }, [careRecipientId])

  if (loading || dismissed || !isInAlertWindow()) return null

  const now = new Date()
  const yearStart = `${now.getFullYear()}-01-01`
  const yearEnd = `${now.getFullYear()}-12-31`

  const ytdTotal = expenses
    .filter(e => e.date >= yearStart && e.date <= yearEnd)
    .reduce((sum, e) => sum + Number(e.amount), 0)

  const cap = annualCap ?? 3000
  const remaining = Math.max(cap - ytdTotal, 0)

  if (remaining <= 0) return null

  const daysLeft = getDaysUntilYearEnd()

  if (!trackedRef.current) {
    trackedRef.current = true
    trackYearEndAlertShown({ remaining, days_left: daysLeft })
  }

  const handleDismiss = () => {
    sessionStorage.setItem(getSessionDismissKey(careRecipientId), '1')
    setDismissed(true)
    trackYearEndAlertDismissed()
  }

  const handleNotify = async () => {
    if (!('Notification' in window)) return

    setNotificationState('requesting')

    const permission = Notification.permission === 'granted'
      ? 'granted'
      : await Notification.requestPermission()

    if (permission === 'granted') {
      new Notification('DCFSA Balance Alert', {
        body: `You have $${remaining.toFixed(2)} unspent in your DCFSA with ${daysLeft} days left. Use it or lose it!`,
        icon: '/favicon.svg',
      })
      setNotificationState('sent')
      trackYearEndNotificationSent()
    } else {
      setNotificationState('denied')
    }
  }

  let urgencyLabel = ''
  let urgencyBg = 'bg-[#4A7FA5]/10 border-[#4A7FA5]/30'
  if (daysLeft <= 7) {
    urgencyLabel = 'Final week!'
    urgencyBg = 'bg-red-50 border-red-200'
  } else if (daysLeft <= 30) {
    urgencyLabel = 'Last month'
    urgencyBg = 'bg-amber-50 border-amber-200'
  }

  return (
    <div className={`rounded-xl border p-4 mb-6 ${urgencyBg}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 flex-1">
          <div className="mt-0.5 flex-shrink-0 w-8 h-8 rounded-full bg-[#4A7FA5] flex items-center justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-white" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <h4 className="text-sm font-semibold text-gray-900">Unspent DCFSA Balance</h4>
              {urgencyLabel && (
                <span className={`text-xs font-medium px-1.5 py-0.5 rounded ${daysLeft <= 7 ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>
                  {urgencyLabel}
                </span>
              )}
            </div>
            <p className="text-sm text-gray-700">
              You have <span className="font-bold text-[#4A7FA5]">${remaining.toFixed(2)}</span> remaining with{' '}
              <span className="font-bold">{daysLeft} day{daysLeft !== 1 ? 's' : ''}</span> until year-end.
              DCFSA funds are use-it-or-lose-it — submit eligible expenses before December 31.
            </p>

            <div className="flex flex-wrap items-center gap-2 mt-3">
              {onAddExpense && (
                <button
                  onClick={onAddExpense}
                  className="inline-flex items-center gap-1.5 text-sm font-medium text-white bg-[#4A7FA5] rounded-lg px-3 py-1.5 hover:bg-[#3d6b8c] transition-colors"
                >
                  + Add expense
                </button>
              )}

              {'Notification' in window && notificationState !== 'sent' && (
                <button
                  onClick={handleNotify}
                  disabled={notificationState === 'requesting'}
                  className="inline-flex items-center gap-1.5 text-sm font-medium text-[#4A7FA5] bg-white border border-[#4A7FA5]/30 rounded-lg px-3 py-1.5 hover:bg-[#4A7FA5]/5 transition-colors disabled:opacity-50"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M10 2a6 6 0 00-6 6v3.586l-.707.707A1 1 0 004 14h12a1 1 0 00.707-1.707L16 11.586V8a6 6 0 00-6-6zM10 18a3 3 0 01-3-3h6a3 3 0 01-3 3z" />
                  </svg>
                  {notificationState === 'requesting' ? 'Requesting...' : 'Remind me'}
                </button>
              )}

              {notificationState === 'sent' && (
                <span className="text-xs text-green-600 font-medium">Notification sent</span>
              )}
              {notificationState === 'denied' && (
                <span className="text-xs text-gray-500">Notifications blocked by browser</span>
              )}
            </div>
          </div>
        </div>

        <button
          onClick={handleDismiss}
          className="flex-shrink-0 p-1 text-gray-400 hover:text-gray-600 transition-colors"
          aria-label="Dismiss alert"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
          </svg>
        </button>
      </div>
    </div>
  )
}
