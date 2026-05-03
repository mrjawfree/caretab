import { useState } from 'react'
import { supabase } from '../lib/supabase'
import type { User } from '@supabase/supabase-js'

interface OnboardingProps {
  user: User
  onComplete: () => void
}

const RELATIONSHIPS = ['Mother', 'Father', 'Spouse', 'Grandparent', 'Child', 'Sibling', 'Other']

export function Onboarding({ user, onComplete }: OnboardingProps) {
  const [step, setStep] = useState(1)
  const [name, setName] = useState('')
  const [relationship, setRelationship] = useState('')
  const [dcfsaCap, setDcfsaCap] = useState('3000')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [recipientId, setRecipientId] = useState<string | null>(null)

  const handleCreateRecipient = async () => {
    if (!name.trim() || !relationship) return
    setSaving(true)
    setError(null)

    const { data, error: err } = await supabase
      .from('care_recipients')
      .insert({
        owner_user_id: user.id,
        name: name.trim(),
        relationship,
      })
      .select('id')
      .single()

    if (err) {
      setError(err.message)
      setSaving(false)
      return
    }

    setRecipientId(data.id)
    setSaving(false)
    setStep(3)
  }

  const handleSaveCap = async () => {
    if (!recipientId) return
    const parsed = parseFloat(dcfsaCap)
    if (isNaN(parsed) || parsed < 0) {
      setError('Enter a valid amount')
      return
    }

    setSaving(true)
    setError(null)

    const { error: err } = await supabase
      .from('dcfsa_settings')
      .upsert({
        care_recipient_id: recipientId,
        annual_cap: parsed,
      }, { onConflict: 'care_recipient_id' })

    if (err) {
      setError(err.message)
      setSaving(false)
      return
    }

    setSaving(false)
    setStep(4)
  }

  const handleFinish = () => {
    localStorage.setItem('hasCompletedOnboarding', 'true')
    onComplete()
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        {step === 1 && (
          <div className="text-center">
            <div className="w-16 h-16 bg-[#4A7FA5]/10 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-[#4A7FA5]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
              </svg>
            </div>
            <h1 className="text-xl font-bold text-gray-900 mb-2">Welcome to CareTab</h1>
            <p className="text-sm text-gray-500 mb-8">
              Track caregiving expenses, manage DCFSA benefits, and coordinate with family — all in one place.
            </p>
            <button
              onClick={() => setStep(2)}
              className="w-full bg-[#4A7FA5] text-white font-medium rounded-lg py-3 text-sm hover:bg-[#3d6d8f] transition-colors"
            >
              Get Started
            </button>
            <StepDots current={1} />
          </div>
        )}

        {step === 2 && (
          <div>
            <h2 className="text-lg font-bold text-gray-900 mb-1">Who are you caring for?</h2>
            <p className="text-sm text-gray-500 mb-6">Add your first care recipient to get started.</p>

            {error && (
              <div className="bg-red-50 text-red-700 text-sm rounded-lg p-3 mb-4">{error}</div>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="e.g. Mom"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#4A7FA5] focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Relationship <span className="text-red-500">*</span>
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {RELATIONSHIPS.map(r => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setRelationship(r)}
                      className={`rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
                        relationship === r
                          ? 'border-[#4A7FA5] bg-[#4A7FA5]/5 text-[#4A7FA5]'
                          : 'border-gray-200 text-gray-700 hover:border-gray-300'
                      }`}
                    >
                      {r}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <button
              onClick={handleCreateRecipient}
              disabled={!name.trim() || !relationship || saving}
              className="w-full mt-6 bg-[#4A7FA5] text-white font-medium rounded-lg py-3 text-sm hover:bg-[#3d6d8f] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? 'Saving...' : 'Next'}
            </button>
            <StepDots current={2} />
          </div>
        )}

        {step === 3 && (
          <div>
            <h2 className="text-lg font-bold text-gray-900 mb-1">Set your DCFSA cap</h2>
            <p className="text-sm text-gray-500 mb-6">
              This helps track your dependent care FSA spending. You can change it later.
            </p>

            {error && (
              <div className="bg-red-50 text-red-700 text-sm rounded-lg p-3 mb-4">{error}</div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Annual cap ($)</label>
              <input
                type="text"
                inputMode="decimal"
                value={dcfsaCap}
                onChange={e => setDcfsaCap(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#4A7FA5] focus:border-transparent"
              />
              <p className="text-xs text-gray-400 mt-1">The IRS default limit is $5,000 for most households.</p>
            </div>

            <button
              onClick={handleSaveCap}
              disabled={saving}
              className="w-full mt-6 bg-[#4A7FA5] text-white font-medium rounded-lg py-3 text-sm hover:bg-[#3d6d8f] transition-colors disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Next'}
            </button>
            <button
              onClick={() => setStep(4)}
              className="w-full mt-2 text-sm text-gray-500 hover:text-gray-700 transition-colors py-2"
            >
              Skip for now
            </button>
            <StepDots current={3} />
          </div>
        )}

        {step === 4 && (
          <div className="text-center">
            <div className="w-16 h-16 bg-green-50 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">You're all set!</h2>
            <p className="text-sm text-gray-500 mb-8">
              {name.trim()}'s care profile is ready. Start tracking expenses and managing benefits.
            </p>
            <button
              onClick={handleFinish}
              className="w-full bg-[#4A7FA5] text-white font-medium rounded-lg py-3 text-sm hover:bg-[#3d6d8f] transition-colors"
            >
              Go to Dashboard
            </button>
            <StepDots current={4} />
          </div>
        )}
      </div>
    </div>
  )
}

function StepDots({ current }: { current: number }) {
  return (
    <div className="flex items-center justify-center gap-2 mt-8">
      {[1, 2, 3, 4].map(s => (
        <div
          key={s}
          className={`w-2 h-2 rounded-full transition-colors ${
            s === current ? 'bg-[#4A7FA5]' : 'bg-gray-200'
          }`}
        />
      ))}
    </div>
  )
}
