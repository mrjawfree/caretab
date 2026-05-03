import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useCareRecipients } from '../contexts/CareRecipientContext'
import { Header } from '../components/Header'
import { ExpenseForm } from '../components/ExpenseForm'
import { ExpenseLedger } from '../components/ExpenseLedger'
import { InviteForm } from '../components/InviteForm'
import { MembersList } from '../components/MembersList'
import { DcfsaProgressTracker } from '../components/DcfsaProgressTracker'
import type { CareRecipient, Expense, CareRecipientMember, MemberRole } from '../lib/types'
import type { User } from '@supabase/supabase-js'

interface RecipientDetailPageProps {
  user: User
  onSignOut: () => void
}

export function RecipientDetailPage({ user, onSignOut }: RecipientDetailPageProps) {
  const { recipientId } = useParams<{ recipientId: string }>()
  const navigate = useNavigate()
  const { setActiveRecipientId } = useCareRecipients()
  const [recipient, setRecipient] = useState<CareRecipient | null>(null)
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [members, setMembers] = useState<CareRecipientMember[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [showInvite, setShowInvite] = useState(false)
  const [confirmation, setConfirmation] = useState(false)
  const [inviteConfirmation, setInviteConfirmation] = useState(false)
  const [myRole, setMyRole] = useState<MemberRole | null>(null)

  const isOwner = recipient?.owner_user_id === user.id
  const canEdit = isOwner || myRole === 'editor'

  useEffect(() => {
    if (recipientId) setActiveRecipientId(recipientId)
  }, [recipientId, setActiveRecipientId])

  const fetchData = async () => {
    if (!recipientId) return

    const [recipientRes, expensesRes, membersRes] = await Promise.all([
      supabase
        .from('care_recipients')
        .select('*')
        .eq('id', recipientId)
        .single(),
      supabase
        .from('expenses')
        .select('*')
        .eq('care_recipient_id', recipientId)
        .order('date', { ascending: false }),
      supabase
        .from('care_recipient_members')
        .select('*')
        .eq('care_recipient_id', recipientId)
        .order('created_at', { ascending: true }),
    ])

    if (recipientRes.data) setRecipient(recipientRes.data)
    if (expensesRes.data) setExpenses(expensesRes.data)
    if (membersRes.data) {
      setMembers(membersRes.data)
      const me = membersRes.data.find(
        (m: CareRecipientMember) => m.user_id === user.id && m.status === 'accepted'
      )
      setMyRole(me?.role ?? null)
    }
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

  const handleInvited = () => {
    setShowInvite(false)
    setInviteConfirmation(true)
    setTimeout(() => setInviteConfirmation(false), 3000)
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

  return (
    <div className="min-h-screen bg-gray-50">
      <Header user={user} onSignOut={onSignOut} showBack />

      <main className="max-w-lg mx-auto px-4 py-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-6">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">{recipient.name}</h2>
              {recipient.relationship && (
                <p className="text-sm text-gray-500 mt-0.5">{recipient.relationship}</p>
              )}
              {recipient.date_of_birth && (
                <p className="text-xs text-gray-400 mt-1">
                  DOB: {new Date(recipient.date_of_birth).toLocaleDateString()}
                </p>
              )}
            </div>
            {!isOwner && myRole && (
              <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 capitalize">
                {myRole}
              </span>
            )}
          </div>
          {recipient.notes && (
            <p className="text-sm text-gray-600 mt-2 border-t border-gray-100 pt-2">{recipient.notes}</p>
          )}
        </div>

        {isOwner && (
          <>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-base font-semibold text-gray-900">Family members</h3>
              {!showInvite && (
                <button
                  onClick={() => setShowInvite(true)}
                  className="text-indigo-600 text-sm font-medium hover:text-indigo-700 transition-colors"
                >
                  + Invite member
                </button>
              )}
            </div>

            {inviteConfirmation && (
              <div className="bg-green-50 text-green-700 text-sm rounded-lg p-3 mb-4">
                Invite sent successfully.
              </div>
            )}

            {showInvite && (
              <InviteForm
                careRecipientId={recipient.id}
                onInvited={handleInvited}
                onCancel={() => setShowInvite(false)}
              />
            )}

            <MembersList
              members={members.filter(m => m.role !== 'owner')}
              isOwner={isOwner}
              onRemoved={fetchData}
            />
          </>
        )}

        <DcfsaProgressTracker
          careRecipientId={recipient.id}
          expenses={expenses}
          isOwner={isOwner}
        />

        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-semibold text-gray-900">Expense Ledger</h3>
          {!showForm && canEdit && (
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

        {showForm && canEdit && (
          <ExpenseForm
            careRecipientId={recipient.id}
            userId={user.id}
            onSaved={handleExpenseSaved}
            onCancel={() => setShowForm(false)}
          />
        )}

        <ExpenseLedger
          expenses={expenses}
          onLogExpense={canEdit ? () => setShowForm(true) : undefined}
        />
      </main>
    </div>
  )
}
