export type Session = {
  id: string
  trainerId: string
  type: 'personal' | 'class'
  capacity: number
  bookedMemberIds: string[]
  date: string
  startTime: string
  endTime: string
  status: 'scheduled' | 'completed' | 'cancelled'
}