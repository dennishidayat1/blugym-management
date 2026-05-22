// ─── Session ──────────────────────────────────────────────────────────────────

export type SessionCategory = 'weight_training' | 'boxing' | 'dance' | 'yoga' | 'pilates' | 'cardio'
export type SessionType = 'group' | 'individual'

export type Session = {
  id: string
  createdAt: string
  updatedAt: string
  trainerId: string
  trainerName?: string       // joined, not in base table
  title: string
  description?: string
  category: SessionCategory
  type: SessionType
  startTime: string          // ISO datetime
  endTime: string            // ISO datetime
  capacity: number
  branchId: string
  branchName?: string        // joined, not in base table
  branchCity?: string        // joined, not in base table
  enrolled?: number          // derived from enrollment count
}

// Session enriched with live enrollment count — used in booking UI
export type SessionWithEnrollments = Omit<Session, 'enrolled'> & {
  enrollmentCount: number
  isFull: boolean
}

// ─── Session Enrollment ───────────────────────────────────────────────────────

// Matches DB check constraint exactly: 'enrolled' | 'cancelled' | 'attended'
export type EnrollmentStatus = 'enrolled' | 'cancelled' | 'attended'

export type SessionEnrollment = {
  id: string
  createdAt: string
  updatedAt: string
  sessionId: string
  memberId: string
  memberPtPackageId: string | null  // null for group sessions — no package deduction
  status: EnrollmentStatus
  enrolledAt: string
  memberName?: string               // joined, not in base table
}

// ─── Booking result ───────────────────────────────────────────────────────────

export type BookingResult = {
  enrollment: SessionEnrollment
  packageUsed: string | null        // package id that was debited, null for group
  sessionsRemaining: number | null  // updated count after deduction, null for group
}