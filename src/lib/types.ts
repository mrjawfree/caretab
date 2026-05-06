export interface CareRecipient {
  id: string
  owner_user_id: string
  name: string
  relationship: string | null
  date_of_birth: string | null
  notes: string | null
  created_at: string
}

export type ExpenseCategory =
  | 'Vision'
  | 'Dental'
  | 'Medical'
  | 'Prescriptions'
  | 'Other'
  | 'Uncategorized'

export const EXPENSE_CATEGORIES: ExpenseCategory[] = [
  'Vision',
  'Dental',
  'Medical',
  'Prescriptions',
  'Other',
]

export const ALL_EXPENSE_CATEGORIES: ExpenseCategory[] = [
  ...EXPENSE_CATEGORIES,
  'Uncategorized',
]

export const CATEGORY_ICONS: Record<ExpenseCategory, string> = {
  Vision: '👁',
  Dental: '🦷',
  Medical: '🏥',
  Prescriptions: '💊',
  Other: '📋',
  Uncategorized: '—',
}

export interface Expense {
  id: string
  care_recipient_id: string
  amount: number
  date: string
  category: ExpenseCategory
  vendor: string
  notes: string | null
  receipt_url: string | null
  reimbursed: boolean
  created_by: string
  created_at: string
}

export type ReimbursementFilter = 'All' | 'Reimbursed' | 'Unreimbursed'

export type MemberRole = 'owner' | 'editor' | 'viewer'
export type MemberStatus = 'pending' | 'accepted'

export interface CareRecipientMember {
  id: string
  care_recipient_id: string
  user_id: string | null
  role: MemberRole
  invited_email: string | null
  status: MemberStatus
  created_at: string
}
