import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { branchService } from '../../../shared/services/branchService'
import { sessionService } from '../services/sessionService'
import { supabase } from '../../../shared/lib/supabaseClient'
import { useAuth } from '../../../shared/context/AuthContext'
import type { SessionWithEnrollments } from '../models/session'
import type { Branch } from '../../../shared/models/Branch'

interface BookingFilters {
  branchId: string
  specialtyId: string
  date: string
}

type Specialty = { id: string; name: string }

type TrainerSlots = {
  trainerId: string
  trainerName: string
  slots: SessionWithEnrollments[]
}

type SearchState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'done'; results: TrainerSlots[] }
  | { status: 'error'; message: string }

type BookingState =
  | { status: 'idle' }
  | { status: 'booking'; slotId: string }
  | { status: 'success'; slotId: string; sessionsRemaining: number | null }
  | { status: 'error'; message: string }

interface BookPTSessionProps {}

const formatTime = (iso: string) =>
  new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })

export const BookPTSession = (_props: BookPTSessionProps) => {
  const { authState } = useAuth()
  const memberId = authState.status === 'authenticated' ? authState.data.memberId : null
  const navigate = useNavigate()
  const [filters, setFilters] = useState<BookingFilters>({
    branchId: '',
    specialtyId: '',
    date: '',
  })
  const [branches, setBranches] = useState<Branch[]>([])
  const [specialties, setSpecialties] = useState<Specialty[]>([])
  const [search, setSearch] = useState<SearchState>({ status: 'idle' })
  const [booking, setBooking] = useState<BookingState>({ status: 'idle' })

  useEffect(() => {
    branchService.getAll().then(setBranches).catch(console.error)

    const fetchSpecialties = async () => {
      const { data, error } = await supabase
        .from('specialties')
        .select('id, name')
        .order('name')
      
      if (error) {
        console.error(error)
        return
      }
      
      setSpecialties((data ?? []).map(s => ({
        id: String(s.id),
        name: s.name,
      })))
    }

    fetchSpecialties()
  }, [])

  const filtersComplete = filters.branchId && filters.date

  const handleSearch = async () => {
    if (!filtersComplete) return
    setSearch({ status: 'loading' })
    setBooking({ status: 'idle' })
    try {
      const results = await sessionService.getAvailablePTSlots(
        filters.branchId,
        filters.date,
        filters.specialtyId || undefined
      )
      setSearch({ status: 'done', results })
    } catch (err) {
      setSearch({
        status: 'error',
        message: err instanceof Error ? err.message : 'Failed to load available slots',
      })
    }
  }

  const handleBook = async (slotId: string) => {
    if (!memberId) {
      setBooking({ status: 'error', message: 'Your member account is not linked. Please contact admin.' })
      return
    }
    setBooking({ status: 'booking', slotId })
    try {
      const result = await sessionService.bookSession(slotId, memberId)
      setBooking({
        status: 'success',
        slotId,
        sessionsRemaining: result.sessionsRemaining,
      })
      // Refresh results to reflect updated slot availability
      const results = await sessionService.getAvailablePTSlots(
        filters.branchId,
        filters.date,
        filters.specialtyId || undefined
      )
      setSearch({ status: 'done', results })
    } catch (err) {
      setBooking({
        status: 'error',
        message: err instanceof Error ? err.message : 'Booking failed',
      })
    }
  }

  const formatSpecialtyName = (name: string) =>
    name.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <button
        onClick={() => navigate(-1)}
        className="mb-4 px-3 py-2 bg-gray-100 text-gray-600 rounded-lg text-sm hover:bg-gray-200 transition"
      >
        ← Back
      </button>

      <h1 className="text-2xl font-bold mb-6 text-gray-800">Book PT Session</h1>

      {/* Filters */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 mb-6">
        <div className="grid grid-cols-1 gap-4 mb-4">

          {/* Branch */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1">Branch</label>
            <select
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={filters.branchId}
              onChange={e => setFilters(f => ({ ...f, branchId: e.target.value }))}
            >
              <option value="">Select branch</option>
              {branches.map(b => (
                <option key={b.id} value={b.id}>
                  {b.name}{b.city ? ` — ${b.city}` : ''}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Specialty */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1">
                Specialty <span className="font-normal normal-case text-gray-400">(optional)</span>
              </label>
              <select
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={filters.specialtyId}
                onChange={e => setFilters(f => ({ ...f, specialtyId: e.target.value }))}
              >
                <option value="">All specialties</option>
                {specialties.map(s => (
                  <option key={s.id} value={s.id}>{formatSpecialtyName(s.name)}</option>
                ))}
              </select>
            </div>

            {/* Date */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1">Date</label>
              <input
                type="date"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={filters.date}
                onChange={e => setFilters(f => ({ ...f, date: e.target.value }))}
              />
            </div>
          </div>
        </div>

        <button
          onClick={handleSearch}
          disabled={!filtersComplete || search.status === 'loading'}
          className="w-full px-4 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 transition disabled:opacity-50"
        >
          {search.status === 'loading' ? 'Searching…' : 'Find Available Slots'}
        </button>
      </div>

      {/* Error */}
      {search.status === 'error' && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 mb-4">
          {search.message}
        </div>
      )}

      {/* Booking error */}
      {booking.status === 'error' && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 mb-4">
          {booking.message}
        </div>
      )}

      {/* Booking success */}
      {booking.status === 'success' && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 mb-4">
          <p className="font-semibold">Session booked successfully</p>
          {booking.sessionsRemaining !== null && (
            <p className="mt-0.5 text-emerald-600">
              {booking.sessionsRemaining} session{booking.sessionsRemaining !== 1 ? 's' : ''} remaining in your package.
            </p>
          )}
        </div>
      )}

      {/* Results */}
      {search.status === 'done' && (
        search.results.length === 0 ? (
          <div className="rounded-xl border border-dashed border-gray-300 bg-white px-6 py-10 text-center">
            <p className="text-sm font-medium text-gray-500">No available PT slots found</p>
            <p className="text-xs text-gray-400 mt-1">
              Try a different date, branch, or specialty
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {search.results.map(trainer => (
              <div key={trainer.trainerId} className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                {/* Trainer header */}
                <div className="px-5 py-3 border-b border-gray-100 bg-slate-50">
                  <p className="font-semibold text-gray-800 text-sm">{trainer.trainerName}</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {trainer.slots.filter(s => !s.isFull).length} slot{trainer.slots.filter(s => !s.isFull).length !== 1 ? 's' : ''} available
                  </p>
                </div>

                {/* Slots grid */}
                <div className="p-4 grid grid-cols-4 gap-2">
                  {trainer.slots.map(slot => {
                    const isBooked = booking.status === 'success' && booking.slotId === slot.id
                    const isBooking = booking.status === 'booking' && booking.slotId === slot.id
                    const isFull = slot.isFull && !isBooked

                    return (
                      <button
                        key={slot.id}
                        onClick={() => !isFull && !isBooked && handleBook(slot.id)}
                        disabled={isFull || isBooked || booking.status === 'booking'}
                        className={`
                          rounded-lg border py-2 px-1 text-xs font-semibold text-center transition
                          ${isBooked
                            ? 'border-emerald-300 bg-emerald-50 text-emerald-600 cursor-default'
                            : isFull
                              ? 'border-gray-100 bg-gray-50 text-gray-300 cursor-not-allowed'
                              : isBooking
                                ? 'border-blue-300 bg-blue-50 text-blue-500'
                                : 'border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100 cursor-pointer'
                          }
                        `}
                      >
                        {formatTime(slot.startTime)}
                        {isBooked && <span className="block text-emerald-500 text-[10px]">✓ booked</span>}
                        {isFull && <span className="block text-gray-400 text-[10px]">full</span>}
                        {isBooking && <span className="block text-[10px]">...</span>}
                      </button>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        )
      )}

      {/* Idle state */}
      {search.status === 'idle' && (
        <div className="rounded-xl bg-gray-50 border border-gray-200 px-5 py-6 text-sm text-gray-400 space-y-1">
          <p className="font-semibold text-gray-500">How to book a PT session</p>
          <p>1. Select a branch</p>
          <p>2. Optionally filter by trainer specialty</p>
          <p>3. Pick a date and search for available slots</p>
          <p>4. Choose a time slot to book</p>
        </div>
      )}
    </div>
  )
}
