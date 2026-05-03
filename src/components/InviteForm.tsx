import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import type { MemberRole } from '../lib/types'

interface InviteFormProps {
  careRecipientId: string
  onInvited: () => void
  onCancel: () => void
}

export function InviteForm({ careRecipientId, onInvited, onCancel }: InviteFormProps) {
  const { user } = useAuth()
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<MemberRole>('viewer')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError(null)

    const trimmedEmail = email.trim().toLowerCase()

    if (trimmedEmail === user?.email?.toLowerCase()) {
      setError('You cannot invite yourself.')
      setSaving(false)
      return
    }

    const { error: insertError } = await supabase
      .from('care_recipient_members')
      .insert({
        care_recipient_id: careRecipientId,
        invited_email: trimmedEmail,
        role,
        status: 'pending',
      })

    if (insertError) {
      if (insertError.code === '23505') {
        setError('This person has already been invited.')
      } else {
        setError(insertError.message)
      }
    } else {
      onInvited()
    }
    setSaving(false)
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 mb-4 space-y-4">
      <h3 className="text-base font-semibold text-gray-900">Invite family member</h3>

      {error && (
        <div className="bg-red-50 text-red-700 text-sm rounded-lg p-3">{error}</div>
      )}

      <div>
        <label htmlFor="invite-email" className="block text-sm font-medium text-gray-700 mb-1">
          Email address <span className="text-red-500">*</span>
        </label>
        <input
          id="invite-email"
          type="email"
          required
          value={email}
          onChange={e => setEmail(e.target.value)}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          placeholder="family@example.com"
        />
      </div>

      <div>
        <label htmlFor="invite-role" className="block text-sm font-medium text-gray-700 mb-1">
          Permission
        </label>
        <select
          id="invite-role"
          value={role}
          onChange={e => setRole(e.target.value as MemberRole)}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white"
        >
          <option value="viewer">Viewer — can see the ledger</option>
          <option value="editor">Editor — can add and edit expenses</option>
        </select>
      </div>

      <div className="flex gap-3">
        <button
          type="submit"
          disabled={saving}
          className="flex-1 bg-indigo-600 text-white rounded-lg py-2.5 text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors"
        >
          {saving ? 'Sending...' : 'Send invite'}
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
