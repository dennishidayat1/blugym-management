import { supabase } from '../../../shared/lib/supabaseClient'
import type { Session, SessionEnrollment, SessionWithEnrollments, BookingResult } from '../models/session'
import { ToCamelCase, ToSnakeCase } from '../../../shared/utils/transform'

type SessionEnrollmentRecord = { status?: string }

const toError = (err: unknown, fallback: string): Error => {
  if (err && typeof err === 'object' && 'message' in err) {
    return new Error((err as { message: string }).message)
  }
  return new Error(fallback)
}

export const sessionService = {
  getAll: async (): Promise<Session[]> => {
    const { data, error } = await supabase
      .from('sessions')
      .select(`
        *,
        trainers:trainer_id (
          first_name,
          last_name
        ),
        branches:branch_id (
          name,
          city
        ),
        session_enrollments (
          status
        )
      `)
      .order('start_time', { ascending: true })

    if (error) throw error
    return (data || []).map(item => {
      const enrollments = Array.isArray(item.session_enrollments) ? item.session_enrollments : []
      const enrolled = enrollments.filter((e: SessionEnrollmentRecord) => e.status === 'enrolled').length
      return {
        ...ToCamelCase(item),
        trainerName: item.trainers ? `${item.trainers.first_name} ${item.trainers.last_name}` : undefined,
        branchName: item.branches?.name,
        branchCity: item.branches?.city,
        enrolled,
      }
    })
  },

  getById: async (id: string): Promise<Session | null> => {
    const { data, error } = await supabase
      .from('sessions')
      .select(`
        *,
        trainers:trainer_id (
          first_name,
          last_name
        ),
        branches:branch_id (
          name,
          city
        ),
        session_enrollments (
          status
        )
      `)
      .eq('id', id)
      .single()

    if (error) throw error
    if (!data) return null
    const enrollments = Array.isArray(data.session_enrollments) ? data.session_enrollments : []
    const enrolled = enrollments.filter((e: SessionEnrollmentRecord) => e.status === 'enrolled').length
    return {
      ...ToCamelCase(data),
      trainerName: data.trainers ? `${data.trainers.first_name} ${data.trainers.last_name}` : undefined,
      branchName: data.branches?.name,
      branchCity: data.branches?.city,
      enrolled,
    }
  },

  getByTrainer: async (trainerId: string): Promise<Session[]> => {
    const { data, error } = await supabase
      .from('sessions')
      .select('*')
      .eq('trainer_id', trainerId)
      .order('start_time', { ascending: true })

    if (error) throw error
    return (data || []).map(ToCamelCase)
  },

  /**
   * Fetch available PT slots for a branch on a date, grouped by trainer.
   * Filters trainers by specialty so member can find the right trainer.
   * Only returns slots that are not yet fully booked (capacity=1, 0 enrolled).
   */
  getAvailablePTSlots: async (
    branchId: string,
    date: string,
    specialtyId?: string
  ): Promise<{
    trainerId: string
    trainerName: string
    slots: SessionWithEnrollments[]
  }[]> => {
    const [y, m, d] = date.split('-').map(Number)
    const dayStart = new Date(y, m - 1, d).toISOString()
    const dayEnd   = new Date(y, m - 1, d + 1).toISOString()

    // Fetch all individual sessions for branch+date with trainer info and enrollments
    const { data, error } = await supabase
      .from('sessions')
      .select(`
        *,
        trainers:trainer_id (
          id,
          first_name,
          last_name
        ),
        session_enrollments (status)
      `)
      .eq('branch_id', branchId)
      .eq('type', 'individual')
      .gte('start_time', dayStart)
      .lt('start_time', dayEnd)
      .order('start_time', { ascending: true })

    if (error) throw toError(error, 'Failed to fetch PT slots')

    // If specialty filter provided, get trainer IDs that have that specialty
    let specialtyTrainerIds: Set<string> | null = null
    if (specialtyId) {
      const { data: specialtyRows } = await supabase
        .from('trainer_specialties')
        .select('trainer_id')
        .eq('specialty_id', specialtyId)

      specialtyTrainerIds = new Set(
        (specialtyRows ?? []).map(r => String(r.trainer_id))
      )
    }

    // Group slots by trainer
    const byTrainer = new Map<string, {
      trainerName: string
      slots: SessionWithEnrollments[]
    }>()

    for (const row of data ?? []) {
      const trainerId = String(row.trainer_id)

      // Filter by specialty if provided
      if (specialtyTrainerIds && !specialtyTrainerIds.has(trainerId)) continue

      const enrollments = Array.isArray(row.session_enrollments)
        ? row.session_enrollments
        : []
      const enrollmentCount = enrollments.filter(
        (e: SessionEnrollmentRecord) => e.status === 'enrolled'
      ).length

      const session = ToCamelCase(row) as Session
      const slot: SessionWithEnrollments = {
        ...session,
        enrollmentCount,
        isFull: enrollmentCount >= session.capacity,
      }

      if (!byTrainer.has(trainerId)) {
        const name = row.trainers
          ? `${row.trainers.first_name} ${row.trainers.last_name}`
          : 'Unknown'
        byTrainer.set(trainerId, { trainerName: name, slots: [] })
      }
      byTrainer.get(trainerId)!.slots.push(slot)
    }

    return Array.from(byTrainer.entries()).map(([trainerId, val]) => ({
      trainerId,
      trainerName: val.trainerName,
      slots: val.slots,
    }))
  },

  /**
   * Fetch individual sessions for a trainer on a given date,
   * enriched with live enrollment count. Used in BookPTSession.
   */
  getAvailableForTrainerDate: async (
    trainerId: string,
    branchId: string,
    date: string
  ): Promise<SessionWithEnrollments[]> => {
    // Parse date parts to avoid timezone shift (Jakarta = UTC+7)
    const [y, m, d] = date.split('-').map(Number)
    const dayStart = new Date(y, m - 1, d).toISOString()
    const dayEnd = new Date(y, m - 1, d + 1).toISOString()

    const { data, error } = await supabase
      .from('sessions')
      .select(`
        *,
        session_enrollments (status)
      `)
      .eq('trainer_id', trainerId)
      .eq('branch_id', branchId)
      .eq('type', 'individual')
      .gte('start_time', dayStart)
      .lt('start_time', dayEnd)
      .order('start_time', { ascending: true })

    if (error) throw toError(error, 'Failed to fetch sessions')

    return (data ?? []).map(row => {
      const session = ToCamelCase(row) as Session
      const enrollments = Array.isArray(row.session_enrollments) ? row.session_enrollments : []
      const enrollmentCount = enrollments.filter((e: SessionEnrollmentRecord) => e.status === 'enrolled').length
      return {
        ...session,
        enrollmentCount,
        isFull: enrollmentCount >= session.capacity,
      }
    })
  },

  create: async (session: Omit<Session, 'id' | 'createdAt' | 'updatedAt'>): Promise<Session> => {
    const { data, error } = await supabase
      .from('sessions')
      .insert([ToSnakeCase(session)])
      .select()
      .single()

    if (error) throw error
    return ToCamelCase(data)
  },

  update: async (id: string, updates: Partial<Session>): Promise<Session> => {
    const { data, error } = await supabase
      .from('sessions')
      .update(ToSnakeCase({ ...updates, updatedAt: new Date().toISOString() }))
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return ToCamelCase(data)
  },

  delete: async (id: string): Promise<void> => {
    const { error } = await supabase
      .from('sessions')
      .delete()
      .eq('id', id)

    if (error) throw error
  },

  // ─── Enrollment methods ──────────────────────────────────────────────────────

  /**
   * Full PT session booking transaction.
   *
   * Flow:
   * 1. Fetch session — get type & capacity
   * 2. Check capacity — reject if full
   * 3. Check duplicate — reject if already enrolled/cancelled
   * 4. Find oldest-expiring active PT package (individual sessions only)
   * 5. INSERT session_enrollment
   * 6. Decrement sessions_remaining (only after step 5 succeeds)
   *
   * Group sessions skip steps 4 & 6 — no package required or debited.
   */
  bookSession: async (sessionId: string, memberId: string): Promise<BookingResult> => {
    // Step 1: Fetch session
    const { data: sessionRow, error: sessionError } = await supabase
      .from('sessions')
      .select('id, type, capacity')
      .eq('id', sessionId)
      .single()

    if (sessionError) throw toError(sessionError, 'Session not found')
    const session = ToCamelCase(sessionRow) as Pick<Session, 'id' | 'type' | 'capacity'>

    // Step 2: Check capacity
    const { count: enrolledCount, error: countError } = await supabase
      .from('session_enrollments')
      .select('*', { count: 'exact', head: true })
      .eq('session_id', sessionId)
      .eq('status', 'enrolled')

    if (countError) throw toError(countError, 'Failed to check session capacity')
    if ((enrolledCount ?? 0) >= session.capacity) {
      throw new Error('This session is full')
    }

    // Step 3: Check duplicate
    const { data: existing, error: dupError } = await supabase
      .from('session_enrollments')
      .select('id, status')
      .eq('session_id', sessionId)
      .eq('member_id', memberId)
      .maybeSingle()

    if (dupError) throw toError(dupError, 'Failed to check existing enrollment')
    if (existing?.status === 'enrolled') {
      throw new Error('You are already enrolled in this session')
    }
    if (existing?.status === 'cancelled') {
      throw new Error('You previously cancelled this session — please contact staff to re-enroll')
    }

    // Step 4: Find oldest-expiring active PT package (individual only)
    let packageId: string | null = null
    let currentRemaining: number | null = null

    if (session.type === 'individual') {
      const { data: packages, error: pkgError } = await supabase
        .from('member_pt_packages')
        .select('id, sessions_remaining, expires_at')
        .eq('member_id', memberId)
        .gt('sessions_remaining', 0)
        .gt('expires_at', new Date().toISOString())
        .order('expires_at', { ascending: true }) // oldest expiry first
        .limit(1)

      if (pkgError) throw toError(pkgError, 'Failed to fetch PT packages')
      if (!packages || packages.length === 0) {
        throw new Error('No active PT package with remaining sessions. Please purchase a package first.')
      }

      packageId = String(packages[0].id)
      currentRemaining = packages[0].sessions_remaining
    }

    // Step 5: Insert enrollment
    const { data: enrollmentRow, error: enrollError } = await supabase
      .from('session_enrollments')
      .insert({
        session_id: sessionId,
        member_id: memberId,
        member_pt_package_id: packageId,
        status: 'enrolled',
        enrolled_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (enrollError) {
      if (enrollError.code === '23505') { // unique_session_member constraint
        throw new Error('You are already enrolled in this session')
      }
      throw toError(enrollError, 'Failed to create enrollment')
    }

    // Step 6: Deduct from package (only after enrollment succeeds)
    let sessionsRemaining: number | null = null

    if (packageId && currentRemaining !== null) {
      const newRemaining = currentRemaining - 1
      const { error: deductError } = await supabase
        .from('member_pt_packages')
        .update({
          sessions_remaining: newRemaining,
          updated_at: new Date().toISOString(),
        })
        .eq('id', packageId)

      if (deductError) {
        console.error('CRITICAL: enrollment created but package deduction failed', {
          enrollmentId: enrollmentRow.id,
          packageId,
          error: deductError,
        })
        throw new Error('Booking was created but session deduction failed. Please contact staff.')
      }

      sessionsRemaining = newRemaining
    }

    return {
      enrollment: ToCamelCase(enrollmentRow) as SessionEnrollment,
      packageUsed: packageId,
      sessionsRemaining,
    }
  },

  /**
   * Cancel an enrollment and refund 1 session to the original package.
   * Only 'enrolled' status can be cancelled.
   */
  cancelEnrollment: async (enrollmentId: string): Promise<void> => {
    const { data: enrollment, error: fetchError } = await supabase
      .from('session_enrollments')
      .select('id, status, member_pt_package_id')
      .eq('id', enrollmentId)
      .single()

    if (fetchError) throw toError(fetchError, 'Enrollment not found')
    if (enrollment.status !== 'enrolled') {
      throw new Error(`Cannot cancel — status is '${enrollment.status}'`)
    }

    const { error: cancelError } = await supabase
      .from('session_enrollments')
      .update({ status: 'cancelled', updated_at: new Date().toISOString() })
      .eq('id', enrollmentId)

    if (cancelError) throw toError(cancelError, 'Failed to cancel enrollment')

    // Refund session to original package
    if (enrollment.member_pt_package_id) {
      const { data: pkg, error: pkgError } = await supabase
        .from('member_pt_packages')
        .select('sessions_remaining')
        .eq('id', enrollment.member_pt_package_id)
        .single()

      if (!pkgError && pkg) {
        await supabase
          .from('member_pt_packages')
          .update({
            sessions_remaining: pkg.sessions_remaining + 1,
            updated_at: new Date().toISOString(),
          })
          .eq('id', enrollment.member_pt_package_id)
      }
    }
  },

  /**
   * @deprecated Use bookSession() instead — this inserts with wrong status
   * and does not deduct PT package sessions.
   */
  enrollMember: async (sessionId: string, memberId: string): Promise<SessionEnrollment> => {
    const { data, error } = await supabase
      .from('session_enrollments')
      .insert([{ session_id: sessionId, member_id: memberId, status: 'enrolled' }])
      .select()
      .single()

    if (error) throw error
    return ToCamelCase(data)
  },

  unenrollMember: async (enrollmentId: string): Promise<void> => {
    const { error } = await supabase
      .from('session_enrollments')
      .delete()
      .eq('id', enrollmentId)

    if (error) throw error
  },

  getSessionEnrollments: async (sessionId: string): Promise<SessionEnrollment[]> => {
    const { data, error } = await supabase
      .from('session_enrollments')
      .select('*')
      .eq('session_id', sessionId)

    if (error) throw error
    return (data || []).map(ToCamelCase)
  },

  getMemberEnrollments: async (memberId: string): Promise<SessionEnrollment[]> => {
    const { data, error } = await supabase
      .from('session_enrollments')
      .select('*')
      .eq('member_id', memberId)

    if (error) throw error
    return (data || []).map(ToCamelCase)
  },
}