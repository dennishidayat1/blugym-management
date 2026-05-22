import { supabase } from '../../../shared/lib/supabaseClient'
import { ToCamelCase } from '../../../shared/utils/transform'
import type { TrainerSchedule, ShiftType } from '../models/ptPackage'

// ─── Error helper ─────────────────────────────────────────────────────────────

const toError = (err: unknown, fallback: string): Error => {
  if (err && typeof err === 'object' && 'message' in err) {
    return new Error((err as { message: string }).message)
  }
  return new Error(fallback)
}

export const trainerScheduleService = {
  /** All schedules for a branch within a given week. */
  getWeekSchedules: async (
    branchId: string,
    weekStartDate: string
  ): Promise<TrainerSchedule[]> => {
    const [y, m, d] = weekStartDate.split('-').map(Number)
    const weekEnd = new Date(y, m - 1, d + 6)
    const weekEndStr = [
      weekEnd.getFullYear(),
      String(weekEnd.getMonth() + 1).padStart(2, '0'),
      String(weekEnd.getDate()).padStart(2, '0'),
    ].join('-')

    const { data, error } = await supabase
      .from('trainer_schedules')
      .select('*')
      .eq('branch_id', branchId)
      .gte('schedule_date', weekStartDate)
      .lte('schedule_date', weekEndStr)
      .order('schedule_date', { ascending: true })

    if (error) throw toError(error, 'Failed to fetch week schedules')
    return (data ?? []).map(ToCamelCase)
  },

  /** All schedules for a specific trainer within a given week. */
  getTrainerWeekSchedules: async (
    trainerId: string,
    branchId: string,
    weekStartDate: string
  ): Promise<TrainerSchedule[]> => {
    const [y, m, d] = weekStartDate.split('-').map(Number)
    const weekEnd = new Date(y, m - 1, d + 6)
    const weekEndStr = [
      weekEnd.getFullYear(),
      String(weekEnd.getMonth() + 1).padStart(2, '0'),
      String(weekEnd.getDate()).padStart(2, '0'),
    ].join('-')

    const { data, error } = await supabase
      .from('trainer_schedules')
      .select('*')
      .eq('trainer_id', trainerId)
      .eq('branch_id', branchId)
      .gte('schedule_date', weekStartDate)
      .lte('schedule_date', weekEndStr)
      .order('schedule_date', { ascending: true })

    if (error) throw toError(error, 'Failed to fetch trainer schedules')
    return (data ?? []).map(ToCamelCase)
  },

  /** Single day schedule for a trainer. Returns null if not found. */
  getDaySchedule: async (
    trainerId: string,
    branchId: string,
    date: string
  ): Promise<TrainerSchedule | null> => {
    const { data, error } = await supabase
      .from('trainer_schedules')
      .select('*')
      .eq('trainer_id', trainerId)
      .eq('branch_id', branchId)
      .eq('schedule_date', date)
      .maybeSingle()

    if (error) throw toError(error, 'Failed to fetch day schedule')
    return data ? ToCamelCase(data) : null
  },

  /**
   * Save a trainer's schedule for a single day.
   * ONLY handles trainer_schedules row — does NOT generate PT slots.
   * Call generateDaySlots separately after all days are saved.
   */
  saveDaySchedule: async (
    trainerId: string,
    branchId: string,
    date: string,
    shiftType: ShiftType
  ): Promise<TrainerSchedule | null> => {
    const editable = await trainerScheduleService.isWeekEditable(date)
    if (!editable) {
      throw new Error('This week is not editable.')
    }

    if (shiftType === 'OFF') {
      const { error } = await supabase
        .from('trainer_schedules')
        .delete()
        .eq('trainer_id', trainerId)
        .eq('schedule_date', date)

      if (error) throw toError(error, 'Failed to remove schedule')
      return null
    }

    // Try update first, insert if no row exists
    const { data: updateData } = await supabase
      .from('trainer_schedules')
      .update({
        shift_type: shiftType,
        branch_id: branchId,
        updated_at: new Date().toISOString(),
      })
      .eq('trainer_id', trainerId)
      .eq('schedule_date', date)
      .select()

    // If update matched a row, return it
    if (updateData && updateData.length > 0) return ToCamelCase(updateData[0])

    const { data: inserted, error: insertError } = await supabase
      .from('trainer_schedules')
      .insert({
        trainer_id: trainerId,
        branch_id: branchId,
        schedule_date: date,
        shift_type: shiftType,
      })
      .select()
      .single()

    if (insertError) throw toError(insertError, 'Failed to save schedule')
    return ToCamelCase(inserted)
  },

  /**
   * Generate PT slots for a single day based on shift type.
   * Call this ONCE per trainer after all days in a week are saved.
   *
   * - Deletes unbooked individual sessions for trainer+date
   * - Generates 8 one-hour slots: MORNING 06–13, EVENING 14–21
   * - OFF: only deletes unbooked slots, no new slots
   * - Already-booked slots are always preserved
   *
   * Uses ISO strings with explicit local timezone offset to avoid UTC shift.
   */
  generateDaySlots: async (
    trainerId: string,
    branchId: string,
    date: string,
    shiftType: ShiftType
  ): Promise<void> => {
    const [y, m, d] = date.split('-').map(Number)

    // Build day bounds as local ISO strings (not UTC)
    const pad = (n: number) => String(n).padStart(2, '0')
    const localDateStr = `${y}-${pad(m)}-${pad(d)}`
    const nextDay = new Date(y, m - 1, d + 1)
    const nextDateStr = `${nextDay.getFullYear()}-${pad(nextDay.getMonth() + 1)}-${pad(nextDay.getDate())}`

    // Fetch existing individual slots for this trainer+date using date column
    const { data: existingSlots } = await supabase
      .from('sessions')
      .select('id')
      .eq('trainer_id', trainerId)
      .eq('branch_id', branchId)
      .eq('type', 'individual')
      .gte('start_time', `${localDateStr}T00:00:00+07:00`)
      .lt('start_time', `${nextDateStr}T00:00:00+07:00`)

    const slotIds = (existingSlots ?? []).map(r => r.id)

    // Find which slots are already booked
    let bookedIds = new Set<string>()
    if (slotIds.length > 0) {
      const { data: enrolledRows } = await supabase
        .from('session_enrollments')
        .select('session_id')
        .in('session_id', slotIds)
        .eq('status', 'enrolled')

      bookedIds = new Set((enrolledRows ?? []).map(r => String(r.session_id)))
    }

    // Delete unbooked slots
    const unbookedIds = slotIds.filter(id => !bookedIds.has(String(id)))
    if (unbookedIds.length > 0) {
      await supabase.from('sessions').delete().in('id', unbookedIds)
    }

    // Generate new slots for working shifts
    if (shiftType !== 'OFF') {
      const startHour = shiftType === 'MORNING' ? 6 : 14
      const slots = Array.from({ length: 8 }, (_, i) => {
        const hour = startHour + i
        const startStr = `${localDateStr}T${pad(hour)}:00:00+07:00`
        const endStr   = `${localDateStr}T${pad(hour + 1)}:00:00+07:00`
        return {
          trainer_id: Number(trainerId),
          branch_id: Number(branchId),
          title: `PT Session ${pad(hour)}:00`,
          type: 'individual',
          category: null,
          capacity: 1,
          start_time: startStr,
          end_time: endStr,
        }
      })

      const { error } = await supabase.from('sessions').insert(slots)
      if (error) throw toError(error, 'Failed to generate PT slots')
    }
  },

  /**
   * Validate off-day constraints for a trainer's weekly schedules.
   * OFF = absent from scheduleMap (no row in DB).
   * Rules: max 1 weekday OFF (Mon–Fri), max 1 weekend OFF (Sat–Sun).
   */
  validateOffDayConstraints: (
    schedules: TrainerSchedule[],
    allWeekDates: string[]
  ): { valid: boolean; errors: string[] } => {
    const workingDates = new Set(schedules.map(s => s.scheduleDate))
    const errors: string[] = []

    const getDayOfWeek = (dateStr: string) => {
      const [y, m, d] = dateStr.split('-').map(Number)
      return new Date(y, m - 1, d).getDay()
    }

    const weekdayOffCount = allWeekDates.filter(d => {
      const day = getDayOfWeek(d)
      return day >= 1 && day <= 5 && !workingDates.has(d)
    }).length

    const weekendOffCount = allWeekDates.filter(d => {
      const day = getDayOfWeek(d)
      return (day === 0 || day === 6) && !workingDates.has(d)
    }).length

    if (weekdayOffCount > 1) errors.push(`Max 1 weekday off (${weekdayOffCount} days off)`)
    if (weekendOffCount > 1) errors.push(`Max 1 weekend off (Sat & Sun both off)`)

    return { valid: errors.length === 0, errors }
  },

  /** A week is editable if the schedule date is strictly in the future. */
  isWeekEditable: async (date: string): Promise<boolean> => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const [y, m, d] = date.split('-').map(Number)
    return new Date(y, m - 1, d) > today
  },
}
