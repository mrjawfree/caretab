import { useEffect } from 'react'
import { supabase } from '../lib/supabase'
import type { User } from '@supabase/supabase-js'

export function useAcceptInvites(user: User | null) {
  useEffect(() => {
    if (!user?.email) return

    const accept = async () => {
      const { data: pending } = await supabase
        .from('care_recipient_members')
        .select('id')
        .eq('invited_email', user.email!.toLowerCase())
        .eq('status', 'pending')

      if (!pending?.length) return

      for (const invite of pending) {
        await supabase
          .from('care_recipient_members')
          .update({ user_id: user.id, status: 'accepted' })
          .eq('id', invite.id)
      }
    }

    accept()
  }, [user?.id, user?.email])
}
