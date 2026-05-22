export type Member = {
  id: string
  firstName: string
  lastName: string
  gender: 'male' | 'female'
  email?: string
  phone?: string
  birthDate?: string
  joinDate: string
  expiryDate: string 
  membershipDuration: number
  membershipType: 'basic' | 'ultra'
  status: 'active' | 'inactive' | 'suspended'
  height?: number
  weight?: number
  createdAt?: string
  updatedAt?: string
}
