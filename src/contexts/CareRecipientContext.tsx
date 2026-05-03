import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import type { CareRecipient } from '../lib/types'
import type { User } from '@supabase/supabase-js'

interface CareRecipientContextValue {
  recipients: CareRecipient[]
  sharedRecipients: CareRecipient[]
  allRecipients: CareRecipient[]
  activeRecipient: CareRecipient | null
  setActiveRecipientId: (id: string | null) => void
  loading: boolean
  refresh: () => Promise<void>
}

const CareRecipientContext = createContext<CareRecipientContextValue | null>(null)

export function CareRecipientProvider({ user, children }: { user: User; children: React.ReactNode }) {
  const [recipients, setRecipients] = useState<CareRecipient[]>([])
  const [sharedRecipients, setSharedRecipients] = useState<CareRecipient[]>([])
  const [activeId, setActiveId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchRecipients = useCallback(async () => {
    const [ownedRes, sharedRes] = await Promise.all([
      supabase
        .from('care_recipients')
        .select('*')
        .eq('owner_user_id', user.id)
        .order('created_at', { ascending: false }),
      supabase
        .from('care_recipient_members')
        .select('care_recipient_id, role, care_recipients(*)')
        .eq('user_id', user.id)
        .eq('status', 'accepted')
        .neq('role', 'owner'),
    ])

    const owned = ownedRes.data ?? []
    setRecipients(owned)

    const shared = (sharedRes.data ?? [])
      .map((m: any) => m.care_recipients)
      .filter(Boolean) as CareRecipient[]
    setSharedRecipients(shared)

    setLoading(false)
  }, [user.id])

  useEffect(() => {
    fetchRecipients()
  }, [fetchRecipients])

  const allRecipients = [...recipients, ...sharedRecipients]
  const activeRecipient = activeId ? allRecipients.find(r => r.id === activeId) ?? null : null

  return (
    <CareRecipientContext.Provider
      value={{
        recipients,
        sharedRecipients,
        allRecipients,
        activeRecipient,
        setActiveRecipientId: setActiveId,
        loading,
        refresh: fetchRecipients,
      }}
    >
      {children}
    </CareRecipientContext.Provider>
  )
}

export function useCareRecipients() {
  const ctx = useContext(CareRecipientContext)
  if (!ctx) throw new Error('useCareRecipients must be used within CareRecipientProvider')
  return ctx
}
