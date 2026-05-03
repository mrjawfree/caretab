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
  | 'Medical'
  | 'Pharmacy'
  | 'Transportation'
  | 'Food'
  | 'Housing'
  | 'Personal Care'
  | 'Other'

export const EXPENSE_CATEGORIES: ExpenseCategory[] = [
  'Medical',
  'Pharmacy',
  'Transportation',
  'Food',
  'Housing',
  'Personal Care',
  'Other',
]

export interface Expense {
  id: string
  care_recipient_id: string
  amount: number
  date: string
  category: ExpenseCategory
  vendor: string
  notes: string | null
  receipt_url: string | null
  created_by: string
  created_at: string
}
