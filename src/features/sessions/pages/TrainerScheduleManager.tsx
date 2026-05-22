import { useState, useEffect } from 'react'
import { branchService } from '../../../shared/services/branchService'
import { trainerService } from '../../trainers/services/trainerService'
import { WeeklyScheduleGrid } from '../components/WeeklyScheduleGrid'
import type { Branch } from '../../../shared/models/Branch'
import type { Trainer } from '../../trainers/models/trainer'

const getWeekStart = (date: Date = new Date()): Date => {
  const d = new Date(date)
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1)
  return new Date(d.setDate(diff))
}

const getNextWeekStart = (): Date => {
  const start = getWeekStart()
  const nextWeek = new Date(start)
  nextWeek.setDate(start.getDate() + 7)
  return nextWeek
}

const groupBranchesByCity = (branches: Branch[]) => {
  return branches.reduce<Record<string, Branch[]>>((groups, branch) => {
    const city = branch.city || 'Other'
    if (!groups[city]) groups[city] = []
    groups[city].push(branch)
    return groups
  }, {})
}

export const TrainerScheduleManager = () => {
  const [branches, setBranches] = useState<Branch[]>([])
  const [trainers, setTrainers] = useState<Trainer[]>([])
  const [selectedBranch, setSelectedBranch] = useState('')
  const currentWeekStart = getWeekStart()
  const nextWeekStart = getNextWeekStart()
  const [selectedWeek, setSelectedWeek] = useState<'current' | 'next'>('current')
  const [weekStart, setWeekStart] = useState<string>(() => currentWeekStart.toISOString().split('T')[0])
  const [error, setError] = useState<string | null>(null)
  const [showRules, setShowRules] = useState(false)

  const computeWeekEditable = (weekStartDate: string) => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const scheduleDate = new Date(weekStartDate + 'T00:00:00')
    scheduleDate.setHours(0, 0, 0, 0)
    return scheduleDate > today
  }

  useEffect(() => {
    loadBranches()
  }, [])

  useEffect(() => {
    if (!selectedBranch) {
      setTrainers([])
      return
    }
    loadBranchTrainers(selectedBranch)
  }, [selectedBranch, weekStart])

  const loadBranches = async () => {
    try {
      const data = await branchService.getAll()
      setBranches(data)
    } catch (err) {
      console.error('Failed to load branches:', err)
      setError(err instanceof Error ? err.message : 'Unable to load branches')
    }
  }

  const loadBranchTrainers = async (branchId: string) => {
    try {
      setError(null)
      const data = await trainerService.getByBranch(branchId)
      setTrainers(data)
    } catch (err) {
      console.error('Failed to load trainers:', err)
      setError(err instanceof Error ? err.message : 'Unable to load trainers for branch')
    }
  }

  const selectWeek = (week: 'current' | 'next') => {
    setSelectedWeek(week)
    setWeekStart((week === 'current' ? currentWeekStart : nextWeekStart).toISOString().split('T')[0])
  }

  const selectedWeekStart = new Date(weekStart + 'T00:00:00')
  const currentWeekEnd = new Date(selectedWeekStart)
  currentWeekEnd.setDate(selectedWeekStart.getDate() + 6)
  const isWeekEditable = computeWeekEditable(weekStart)

  return (
    <div className="h-full w-full flex flex-col overflow-hidden bg-gray-50">

      <div className="flex-1 min-h-0 flex flex-col">
        {/* Header & controls */}
        <div className="px-6 pt-5 pb-4 flex flex-col gap-3 flex-shrink-0 border-b border-slate-200 bg-white">

          {/* Title row */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-semibold text-slate-900">Weekly Trainer Schedule</h1>
              <p className="text-xs text-slate-400 mt-0.5">Branch shift planning</p>
            </div>
            <div className="text-xs uppercase tracking-widest text-slate-300">Admin</div>
          </div>

          {/* Controls row — all inline */}
          <div className="flex flex-wrap items-center gap-3">

            {/* Branch select */}
            <select
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100 min-w-[200px]"
              value={selectedBranch}
              onChange={e => setSelectedBranch(e.target.value)}
            >
              <option value="">Choose branch</option>
              {Object.entries(groupBranchesByCity(branches)).map(([city, cityBranches]) => (
                <optgroup key={city} label={city}>
                  {cityBranches.map(branch => (
                    <option key={branch.id} value={branch.id}>{branch.name}</option>
                  ))}
                </optgroup>
              ))}
            </select>

            {/* Week toggle */}
            <div className="flex rounded-lg border border-slate-300 overflow-hidden text-sm font-semibold">
              <button
                onClick={() => selectWeek('current')}
                className={`px-4 py-2 transition ${
                  selectedWeek === 'current'
                    ? 'bg-blue-600 text-white'
                    : 'bg-white text-slate-600 hover:bg-slate-50'
                }`}
              >
                Current
              </button>
              <button
                onClick={() => selectWeek('next')}
                className={`px-4 py-2 border-l border-slate-300 transition ${
                  selectedWeek === 'next'
                    ? 'bg-blue-600 text-white'
                    : 'bg-white text-slate-600 hover:bg-slate-50'
                }`}
              >
                Next
              </button>
            </div>

            {/* Date range */}
            <span className="text-sm text-slate-500">
              {selectedWeekStart.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
              {' – '}
              {currentWeekEnd.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
            </span>

            {/* Editable badge */}
            <span className={`rounded-full px-3 py-1 text-xs font-semibold ${
              isWeekEditable
                ? 'bg-emerald-100 text-emerald-700'
                : 'bg-amber-100 text-amber-700'
            }`}>
              {isWeekEditable ? 'Editable' : 'Locked'}
            </span>

            {/* Shift legend */}
            <div className="flex items-center gap-1.5 text-xs text-slate-500 ml-auto">
              <span className="rounded-md bg-sky-100 px-2 py-0.5 text-sky-700 font-medium">Morning</span>
              <span className="rounded-md bg-amber-100 px-2 py-0.5 text-amber-700 font-medium">Evening</span>
              <span className="rounded-md bg-gray-100 px-2 py-0.5 text-gray-600 font-medium">Off</span>
            </div>

            {/* Rules toggle */}
            <button
              type="button"
              onClick={() => setShowRules(prev => !prev)}
              className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-500 hover:bg-slate-100 transition"
            >
              {showRules ? 'Hide rules' : 'Rules'}
            </button>
          </div>

          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">
              {error}
            </div>
          )}

          {showRules && (
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
              <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-slate-400">Scheduling rules</p>
              <ul className="grid gap-1 text-xs sm:grid-cols-2">
                <li>• Max 2 off days per week</li>
                <li>• Max 1 weekday off (Mon–Fri)</li>
                <li>• Max 1 weekend off (Sat or Sun)</li>
                <li>• Weekend OFF highlighted with green ring</li>
              </ul>
            </div>
          )}
        </div>

        {/* Weekly Schedule Grid — flex-1 min-h-0 agar mengisi sisa tinggi layar.
            PENTING: tidak pakai overflow-hidden di sini, biarkan WeeklyScheduleGrid
            yang handle scroll internal-nya sendiri via flex-1 min-h-0 overflow-auto */}
        {selectedBranch && trainers.length > 0 ? (
          <div className="flex-1 min-h-0 bg-white rounded-t-lg shadow-sm mx-6 mb-0 border-t border-gray-200">
            <WeeklyScheduleGrid
              branchId={selectedBranch}
              trainers={trainers}
              weekStartDate={weekStart}
              isEditable={isWeekEditable}
            />
          </div>
        ) : selectedBranch && trainers.length === 0 ? (
          <div className="flex-1 min-h-0 flex items-center justify-center bg-white rounded-t-lg shadow-sm mx-6 mb-0 border-t border-gray-200">
            <p className="text-gray-600 text-lg">No trainers assigned to this branch yet.</p>
          </div>
        ) : (
          <div className="flex-1 min-h-0 flex items-center justify-center bg-white rounded-t-lg shadow-sm mx-6 mb-0 border-t border-gray-200">
            <p className="text-gray-500 text-lg">Select a branch to view and manage schedules.</p>
          </div>
        )}
      </div>
    </div>
  )
}
