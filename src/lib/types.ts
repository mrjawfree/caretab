export interface CareRecipient {
  id: string
  owner_user_id: string
  name: string
  relationship: string | null
  date_of_birth: string | null
  notes: string | null
  created_at: string
}
