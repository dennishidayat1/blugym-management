export type EmploymentType = 'fulltime' | 'parttime'

export type Trainer = {
  id: string
  createdAt: string
  updatedAt: string
  firstName: string
  lastName: string
  email?: string
  phone?: string
  employmentType?: EmploymentType
  specialties?: string[]
  hireDate?: string
  branchId: string
  branchName?: string
  active: boolean
}
