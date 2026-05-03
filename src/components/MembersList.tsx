import { supabase } from '../lib/supabase'
import type { CareRecipientMember } from '../lib/types'

interface MembersListProps {
  members: CareRecipientMember[]
  isOwner: boolean
  onRemoved: () => void
}

const roleBadge: Record<string, { label: string; className: string }> = {
  owner: { label: 'Owner', className: 'bg-indigo-100 text-indigo-700' },
  editor: { label: 'Editor', className: 'bg-green-100 text-green-700' },
  viewer: { label: 'Viewer', className: 'bg-gray-100 text-gray-600' },
}

export function MembersList({ members, isOwner, onRemoved }: MembersListProps) {
  if (members.length === 0) {
    return (
      <div className="mb-6">
        <div className="text-center py-8 bg-white rounded-xl shadow-sm border border-gray-200">
          <p className="text-gray-400 text-sm">No members yet</p>
        </div>
      </div>
    )
  }

  const handleRemove = async (memberId: string) => {
    await supabase.from('care_recipient_members').delete().eq('id', memberId)
    onRemoved()
  }

  return (
    <div className="mb-6">
      <h3 className="text-base font-semibold text-gray-900 mb-3">Family members</h3>
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 divide-y divide-gray-100">
        {members.map(m => {
          const badge = roleBadge[m.role] ?? roleBadge.viewer
          const displayName = m.invited_email ?? 'Unknown'
          return (
            <div key={m.id} className="flex items-center justify-between px-4 py-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{displayName}</p>
                  {m.status === 'pending' && (
                    <p className="text-xs text-amber-600">Invite pending</p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${badge.className}`}>
                  {badge.label}
                </span>
                {isOwner && m.role !== 'owner' && (
                  <button
                    onClick={() => handleRemove(m.id)}
                    className="text-gray-400 hover:text-red-500 transition-colors"
                    aria-label="Remove member"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                  </button>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
