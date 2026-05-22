import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import type { Trainer } from '../../trainers/models/trainer'
import type { TrainerSchedule, ShiftType } from '../models/ptPackage'
import { trainerScheduleService } from '../services/trainerScheduleService'

// ─── Types ────────────────────────────────────────────────────────────────────

interface WeeklyScheduleGridProps {
  branchId: string
  trainers: Trainer[]
  weekStartDate: string
  isEditable: boolean
}

// ScheduleMap: key = `trainerId|date`, value = TrainerSchedule row from DB.
// A missing key means the trainer is OFF that day (absence-based model).
type ScheduleMap = Record<string, TrainerSchedule>

// TrainerDraft: per-trainer edit state before saving.
// key = date (YYYY-MM-DD), value = ShiftType or undefined (= OFF).
type TrainerDraft = Record<string, ShiftType | undefined>

// ─── Constants ────────────────────────────────────────────────────────────────

// Default state for every cell is OFF.
// Admins must explicitly assign MORNING or EVENING.
const SHIFT_CYCLE: ShiftType[] = ['OFF', 'MORNING', 'EVENING']

const SHIFT_COLORS: Record<ShiftType, { bg: string; text: string; border: string }> = {
  OFF:     { bg: 'bg-gray-100',  text: 'text-gray-500',  border: 'border-gray-200'  },
  MORNING: { bg: 'bg-sky-100',   text: 'text-sky-700',   border: 'border-sky-200'   },
  EVENING: { bg: 'bg-amber-100', text: 'text-amber-800', border: 'border-amber-200' },
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const scheduleKey = (trainerId: string, date: string) => `${trainerId}|${date}`

const getWeekDays = (weekStartDate: string) => {
  const [y, m, day] = weekStartDate.split('-').map(Number)
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(y, m - 1, day + i)
    // Format date as YYYY-MM-DD using local time (not UTC)
    const dateStr = [
      d.getFullYear(),
      String(d.getMonth() + 1).padStart(2, '0'),
      String(d.getDate()).padStart(2, '0'),
    ].join('-')
    const dayOfWeek = d.toLocaleDateString('en-US', { weekday: 'short' })
    return {
      date: dateStr,
      display: `${dayOfWeek} · ${d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`,
      dayOfWeek,
      isWeekend: dayOfWeek === 'Sat' || dayOfWeek === 'Sun',
    }
  })
}

const getNextShift = (current: ShiftType): ShiftType => {
  const idx = SHIFT_CYCLE.indexOf(current)
  return SHIFT_CYCLE[(idx + 1) % SHIFT_CYCLE.length]
}

// Build a TrainerDraft from the global ScheduleMap for a single trainer.
// Only working shifts are stored — absent key = OFF.
const buildTrainerDraft = (
  trainerId: string,
  scheduleMap: ScheduleMap,
  weekDates: string[]
): TrainerDraft => {
  const draft: TrainerDraft = {}
  weekDates.forEach(date => {
    const row = scheduleMap[scheduleKey(trainerId, date)]
    if (row?.shiftType && row.shiftType !== 'OFF') {
      draft[date] = row.shiftType
    }
    // OFF days: no key stored — absence = OFF
  })
  return draft
}

// True when two drafts are identical (no unsaved changes for any day)
const draftsEqual = (a: TrainerDraft, b: TrainerDraft, weekDates: string[]) =>
  weekDates.every(d => (a[d] ?? 'OFF') === (b[d] ?? 'OFF'))

// ─── TrainerRow ───────────────────────────────────────────────────────────────

interface TrainerRowProps {
  trainer: Trainer
  branchId: string
  weekDays: ReturnType<typeof getWeekDays>
  originalDraft: TrainerDraft  // mirrors what is currently committed in DB
  isEditable: boolean
  allWeekDates: string[]
  onSaved: (updatedMap: Partial<ScheduleMap>, deletedKeys: string[]) => void
}

const TrainerRow = ({
  trainer,
  branchId,
  weekDays,
  originalDraft,
  isEditable,
  allWeekDates,
  onSaved,
}: TrainerRowProps) => {
  const [draft, setDraft] = useState<TrainerDraft>(originalDraft)
  const [saving, setSaving] = useState(false)
  const [savedAnim, setSavedAnim] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Sync draft when committed DB state changes (branch/week switch, or after save).
  // Compare by value to avoid resetting on every parent re-render.
  const prevOriginalRef = useRef<string>('')
  useEffect(() => {
    const serialized = allWeekDates.map(d => `${d}:${originalDraft[d] ?? 'OFF'}`).join(',')
    if (serialized !== prevOriginalRef.current) {
      prevOriginalRef.current = serialized
      setDraft({ ...originalDraft })
      setError(null)
    }
  }, [originalDraft, allWeekDates])

  // ── Per-row validation ────────────────────────────────────────────────────
  // Rules: max 1 weekday OFF (Mon–Fri), max 1 weekend OFF (Sat–Sun).
  // OFF = key absent from draft OR value is 'OFF'.
  // IMPORTANT: parse date string directly to avoid timezone shift bugs.
  // new Date('2026-05-18') is parsed as UTC midnight, which in UTC+7 becomes
  // May 17 23:00 local time — causing getDay() to return the wrong day.
  const getDayOfWeek = (dateStr: string): number => {
    const [y, m, d] = dateStr.split('-').map(Number)
    return new Date(y, m - 1, d).getDay() // local Date constructor, no TZ shift
  }

  const validation = useMemo(() => {
    const isOff = (date: string) => !draft[date] || draft[date] === 'OFF'

    const weekdayOffCount = allWeekDates.filter(d => {
      const day = getDayOfWeek(d)
      return day >= 1 && day <= 5 && isOff(d)
    }).length

    const weekendOffCount = allWeekDates.filter(d => {
      const day = getDayOfWeek(d)
      return (day === 0 || day === 6) && isOff(d)
    }).length

    const errors: string[] = []
    if (weekdayOffCount > 1) errors.push(`Max 1 weekday off (${weekdayOffCount} days off)`)
    if (weekendOffCount > 1) errors.push(`Max 1 weekend off (Sat & Sun both off)`)

    return { valid: errors.length === 0, errors }
  }, [draft, allWeekDates])

  const hasChanges = !draftsEqual(draft, originalDraft, allWeekDates)
  const canSave = hasChanges && validation.valid && !saving

  // ── Cell click: cycle OFF → MORNING → EVENING → OFF ──────────────────────
  const handleCellClick = (date: string) => {
    if (!isEditable) return
    const current: ShiftType = draft[date] ?? 'OFF'
    const next = getNextShift(current)
    setDraft(prev => {
      const updated = { ...prev }
      if (next === 'OFF') {
        delete updated[date] // absence of key = OFF, never store undefined
      } else {
        updated[date] = next
      }
      return updated
    })
    setError(null)
  }

  const handleDiscard = () => {
    setDraft(originalDraft)
    setError(null)
  }

  // ── Per-trainer save: compare draft vs original → INSERT / UPDATE / DELETE ─
  const handleSave = async () => {
    if (!canSave) return
    setSaving(true)
    setError(null)

    const updatedMap: Partial<ScheduleMap> = {}
    const deletedKeys: string[] = []
    // Track which dates changed and what shift they now have for slot generation
    const changedDays: { date: string; shiftType: ShiftType }[] = []

    try {
      // Pass 1: save all trainer_schedules rows first
      for (const date of allWeekDates) {
        const originalShift: ShiftType = originalDraft[date] ?? 'OFF'
        const newShift: ShiftType = draft[date] ?? 'OFF'
        if (newShift === originalShift) continue

        const key = scheduleKey(trainer.id, date)
        const saved = await trainerScheduleService.saveDaySchedule(
          trainer.id, branchId, date, newShift
        )

        if (newShift === 'OFF') {
          deletedKeys.push(key)
        } else if (saved) {
          updatedMap[key] = saved
        }

        changedDays.push({ date, shiftType: newShift })
      }

      // Pass 2: regenerate PT slots for each changed day (one call per day)
      for (const { date, shiftType } of changedDays) {
        await trainerScheduleService.generateDaySlots(
          trainer.id, branchId, date, shiftType
        )
      }

      onSaved(updatedMap, deletedKeys)
      setSavedAnim(true)
      setTimeout(() => setSavedAnim(false), 2000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save schedule')
    } finally {
      setSaving(false)
    }
  }

  const hasError = !validation.valid
  const rowBg = hasError ? 'bg-red-50' : 'bg-white'

  return (
    <tr className={`border-b border-gray-200 ${hasError ? 'bg-red-50' : ''}`}>

      {/* Trainer name + per-row actions — sticky left */}
      <td className={`sticky left-0 z-10 w-56 px-4 py-3 ${rowBg}`}>
        <div className="flex flex-col gap-1.5">
          <span className="text-sm font-semibold text-gray-900 leading-tight">
            {trainer.firstName} {trainer.lastName}
          </span>

          {hasError && (
            <p className="text-xs text-red-600 leading-tight">{validation.errors[0]}</p>
          )}
          {error && (
            <p className="text-xs text-red-500 leading-tight">{error}</p>
          )}

          {isEditable && (
            <div className="flex items-center gap-1 flex-wrap">
              {hasChanges && !savedAnim && (
                <button
                  onClick={handleDiscard}
                  disabled={saving}
                  className="rounded-md border border-gray-300 bg-white px-2 py-0.5 text-xs text-slate-600 hover:bg-gray-50 disabled:opacity-40 transition"
                >
                  Discard
                </button>
              )}
              <button
                onClick={handleSave}
                disabled={!canSave}
                className={`rounded-md px-2 py-0.5 text-xs font-semibold transition ${
                  savedAnim
                    ? 'bg-emerald-500 text-white cursor-default'
                    : hasChanges && validation.valid
                      ? 'bg-blue-600 text-white hover:bg-blue-700 cursor-pointer'
                      : hasChanges && !validation.valid
                        ? 'bg-red-100 text-red-400 cursor-not-allowed'
                        : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                }`}
              >
                {saving ? 'Saving…' : savedAnim ? '✓ Saved' : 'Save'}
              </button>
            </div>
          )}
        </div>
      </td>

      {/* Shift cells */}
      {weekDays.map(day => {
        const shiftType: ShiftType = draft[day.date] ?? 'OFF'
        const colors = SHIFT_COLORS[shiftType]
        const isChanged = (draft[day.date] ?? 'OFF') !== (originalDraft[day.date] ?? 'OFF')
        const isWeekendOff = day.isWeekend && shiftType === 'OFF'

        return (
          <td key={day.date} className="border-l border-gray-200 px-3 py-2 text-center">
            <button
              onClick={() => handleCellClick(day.date)}
              disabled={!isEditable}
              title={isEditable ? 'Click to cycle: OFF → MORNING → EVENING' : 'This week is not editable'}
              className={[
                'inline-flex h-10 w-32 items-center justify-center rounded-full border text-sm font-semibold whitespace-nowrap transition-all',
                colors.bg, colors.text, colors.border,
                isEditable ? 'cursor-pointer hover:opacity-80 hover:shadow-md' : 'opacity-50 cursor-not-allowed',
                isChanged    ? 'ring-2 ring-blue-400 ring-offset-1' : '',
                isWeekendOff ? 'ring-2 ring-emerald-400 ring-offset-1' : '',
              ].join(' ')}
            >
              {shiftType}
            </button>
          </td>
        )
      })}
    </tr>
  )
}

// ─── WeeklyScheduleGrid ───────────────────────────────────────────────────────

export const WeeklyScheduleGrid = ({
  branchId,
  trainers,
  weekStartDate,
  isEditable,
}: WeeklyScheduleGridProps) => {
  const [schedules, setSchedules] = useState<ScheduleMap>({})
  const [loading, setLoading] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)

  const weekDays    = useMemo(() => getWeekDays(weekStartDate), [weekStartDate])
  const allWeekDates = useMemo(() => weekDays.map(d => d.date), [weekDays])

  // ── Load all schedules for the week ────────────────────────────────────────
  useEffect(() => {
    const load = async () => {
      setLoading(true)
      setLoadError(null)
      try {
        const rows = await trainerScheduleService.getWeekSchedules(branchId, weekStartDate)
        const map: ScheduleMap = {}
        rows.forEach(row => { map[scheduleKey(row.trainerId, row.scheduleDate)] = row })
        setSchedules(map)
      } catch (err) {
        setLoadError(err instanceof Error ? err.message : 'Failed to load schedules')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [branchId, weekStartDate])

  // ── Staffing totals reflect committed DB state (not in-flight drafts) ──────
  const staffingTotals = useMemo(() => {
    return weekDays.map(day => {
      const counts = { MORNING: 0, EVENING: 0, OFF: 0 }
      trainers.forEach(trainer => {
        const row = schedules[scheduleKey(trainer.id, day.date)]
        const shift: ShiftType = row?.shiftType ?? 'OFF'
        counts[shift] += 1
      })
      return counts
    })
  }, [weekDays, trainers, schedules])

  // ── Called by TrainerRow after a successful save ────────────────────────────
  const handleTrainerSaved = useCallback((
    updatedMap: Partial<ScheduleMap>,
    deletedKeys: string[]
  ) => {
    setSchedules(prev => {
      const deletedSet = new Set(deletedKeys)
      const next: ScheduleMap = {}
      // Copy existing entries, skipping deleted keys
      for (const [k, v] of Object.entries(prev)) {
        if (!deletedSet.has(k)) next[k] = v
      }
      // Merge updated/inserted entries
      Object.assign(next, updatedMap)
      return next
    })
  }, [])

  return (
    <div className="w-full h-full flex flex-col rounded-t-lg border-t border-gray-200 bg-white">

      {!isEditable && (
        <div className="flex-shrink-0 border-b border-amber-200 bg-amber-50 px-4 py-2 text-xs text-amber-700 font-medium">
          This week is locked — view only
        </div>
      )}
      {/* Load error */}
      {loadError && (
        <div className="flex-shrink-0 border-b border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {loadError}
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="flex flex-1 items-center justify-center">
          <p className="text-sm text-slate-400">Loading schedules…</p>
        </div>
      )}

      {/* Grid */}
      {!loading && (
        <div className="flex-1 min-h-0 overflow-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b-2 border-gray-300">
                <th className="w-56 sticky left-0 top-0 z-30 bg-white px-4 py-3 text-left text-sm font-semibold text-gray-700">
                  Trainer
                </th>
                {weekDays.map(day => (
                  <th
                    key={day.date}
                    className={`min-w-[10rem] sticky top-0 z-20 border-l border-gray-200 px-3 py-3 text-center text-sm font-semibold text-gray-700 ${
                      day.isWeekend ? 'bg-slate-50' : 'bg-white'
                    }`}
                  >
                    {day.display}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              {trainers.map(trainer => (
                <TrainerRow
                  key={trainer.id}
                  trainer={trainer}
                  branchId={branchId}
                  weekDays={weekDays}
                  originalDraft={buildTrainerDraft(trainer.id, schedules, allWeekDates)}
                  isEditable={isEditable}
                  allWeekDates={allWeekDates}
                  onSaved={handleTrainerSaved}
                />
              ))}

              {/* Branch staffing summary row */}
              <tr className="border-t-2 border-gray-300 bg-slate-50 sticky bottom-0 z-20">
                <td className="sticky left-0 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-800">
                  Branch staffing
                </td>
                {weekDays.map((day, i) => {
                  const c = staffingTotals[i]
                  return (
                    <td key={day.date} className="border-l border-gray-200 px-3 py-3 text-center text-xs text-slate-700">
                      <div className="space-y-1">
                        <div className="font-semibold text-slate-900">{c.MORNING + c.EVENING} working</div>
                        <div className="flex flex-wrap justify-center gap-1">
                          <span className="rounded-full bg-sky-100 px-2 py-0.5 text-sky-800">M {c.MORNING}</span>
                          <span className="rounded-full bg-amber-100 px-2 py-0.5 text-amber-800">E {c.EVENING}</span>
                          <span className="rounded-full bg-gray-100 px-2 py-0.5 text-slate-800">O {c.OFF}</span>
                        </div>
                      </div>
                    </td>
                  )
                })}
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}