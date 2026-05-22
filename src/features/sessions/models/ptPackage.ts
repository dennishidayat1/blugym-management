export type TrainerSchedule = {
  id: string
  trainerId: string
  branchId: string
  scheduleDate: string // date (YYYY-MM-DD)
  shiftType: 'OFF' | 'MORNING' | 'EVENING'
  isEditable: boolean
  editableUntil: string | null // timestamp or null
  createdAt: string
  updatedAt: string
}

export type ShiftType = 'OFF' | 'MORNING' | 'EVENING'
