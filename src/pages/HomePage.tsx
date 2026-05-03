import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { CareRecipient } from '../lib/types'
import type { User } from '@supabase/supabase-js'

interface HomePageProps {
  user: User
  onSignOut: () => void
}

export function HomePage({ user, onSignOut }: HomePageProps) {
  const [recipients, setRecipients] = useState<CareRecipient[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [name, setName] = useState('')
  const [relationship, setRelationship] = useState('')
  const [dateOfBirth, setDateOfBirth] = useState('')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchRecipients = async () => {
    const { data, error } = await supabase
      .from('care_recipients')
      .select('*')
      .eq('owner_user_id', user.id)
      .order('created_at', { ascending: false })

    if (error) {
      setError(error.message)
    } else {
      setRecipients(data ?? [])
    }
    setLoading(false)
  }

  useEffect(() => {
    fetchRecipients()
  }, [user.id])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError(null)

    const { error } = await supabase.from('care_recipients').insert({
      owner_user_id: user.id,
      name: name.trim(),
      relationship: relationship.trim() || null,
      date_of_birth: dateOfBirth || null,
      notes: notes.trim() || null,
    })

    if (error) {
      setError(error.message)
    } else {
      setName('')
      setRelationship('')
      setDateOfBirth('')
      setNotes('')
      setShowForm(false)
      await fetchRecipients()
    }
    setSaving(false)
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
        <h1 className="text-xl font-bold text-indigo-600">CareTab</h1>
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-500 hidden sm:inline">{user.email}</span>
          <button
            onClick={onSignOut}
            className="text-sm text-gray-500 hover:text-gray-700 font-medium"
          >
            Sign out
          </button>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-gray-900">Your care recipients</h2>
          {!showForm && (
            <button
              onClick={() => setShowForm(true)}
              className="bg-indigo-600 text-white text-sm font-medium rounded-lg px-4 py-2 hover:bg-indigo-700 transition-colors"
            >
              + Add recipient
            </button>
          )}
        </div>

        {error && (
          <div className="bg-red-50 text-red-700 text-sm rounded-lg p-3 mb-4">{error}</div>
        )}

        {showForm && (
          <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 mb-6 space-y-4">
            <h3 className="text-base font-semibold text-gray-900">New care recipient</h3>

            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                Name <span className="text-red-500">*</span>
              </label>
              <input
                id="name"
                type="text"
                required
                value={name}
                onChange={e => setName(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                placeholder="e.g. Mom"
              />
            </div>

            <div>
              <label htmlFor="relationship" className="block text-sm font-medium text-gray-700 mb-1">
                Relationship
              </label>
              <input
                id="relationship"
                type="text"
                value={relationship}
                onChange={e => setRelationship(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                placeholder="e.g. Mother, Father, Spouse"
              />
            </div>

            <div>
              <label htmlFor="dob" className="block text-sm font-medium text-gray-700 mb-1">
                Date of birth
              </label>
              <input
                id="dob"
                type="date"
                value={dateOfBirth}
                onChange={e => setDateOfBirth(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>

            <div>
              <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-1">
                Notes
              </label>
              <textarea
                id="notes"
                value={notes}
                onChange={e => setNotes(e.target.value)}
                rows={3}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
                placeholder="Any details about their care needs..."
              />
            </div>

            <div className="flex gap-3">
              <button
                type="submit"
                disabled={saving}
                className="flex-1 bg-indigo-600 text-white rounded-lg py-2.5 text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors"
              >
                {saving ? 'Saving...' : 'Save recipient'}
              </button>
              <button
                type="button"
                onClick={() => { setShowForm(false); setError(null) }}
                className="px-4 py-2.5 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        )}

        {loading ? (
          <p className="text-center text-gray-400 py-12">Loading...</p>
        ) : recipients.length === 0 && !showForm ? (
          <div className="text-center py-12">
            <p className="text-gray-400 mb-2">No care recipients yet</p>
            <p className="text-sm text-gray-400">Add your first care recipient to get started</p>
          </div>
        ) : (
          <div className="space-y-3">
            {recipients.map(r => (
              <div key={r.id} className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-semibold text-gray-900">{r.name}</h3>
                    {r.relationship && (
                      <p className="text-sm text-gray-500 mt-0.5">{r.relationship}</p>
                    )}
                  </div>
                  {r.date_of_birth && (
                    <span className="text-xs text-gray-400 bg-gray-50 px-2 py-1 rounded">
                      DOB: {new Date(r.date_of_birth).toLocaleDateString()}
                    </span>
                  )}
                </div>
                {r.notes && (
                  <p className="text-sm text-gray-600 mt-2 border-t border-gray-100 pt-2">{r.notes}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
