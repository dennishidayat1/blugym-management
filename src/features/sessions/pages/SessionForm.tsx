import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useSessions } from '../hooks/useSessions'
import { sessionService } from '../services/sessionService'
import { branchService } from '../../../shared/services/branchService'
import { trainerService } from '../../trainers/services/trainerService'
import type { Session, SessionCategory } from '../models/session'
import type { Branch } from '../../../shared/models/Branch'
import type { Trainer } from '../../trainers/models/trainer'

const CATEGORY_SPECIALTY_MAP: Record<SessionCategory, string[]> = {
  weight_training: ['strength_training', 'bodybuilding', 'weight_loss', 'functional_training', 'crossfit'],
  boxing: ['boxing', 'cardio', 'strength_training'],
  dance: ['dance', 'yoga', 'pilates'],
  yoga: ['yoga'],
  pilates: ['pilates'],
  cardio: ['cardio']
}

export const SessionForm = () => {
  const navigate = useNavigate()
  const { id } = useParams()
  const { createSession, updateSession } = useSessions()

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState<SessionCategory>('weight_training')
  const [type, setType] = useState<'group' | 'individual'>('individual')
  const [sessionDate, setSessionDate] = useState('')
  const [startHour, setStartHour] = useState('06')
  const [endHour, setEndHour] = useState('07')
  const [capacity, setCapacity] = useState('1')
  const [branchId, setBranchId] = useState('')
  const [trainerId, setTrainerId] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const [branches, setBranches] = useState<Branch[]>([])
  const [trainers, setTrainers] = useState<Trainer[]>([])
  const [availableTrainers, setAvailableTrainers] = useState<Trainer[]>([])

  const categories: SessionCategory[] = ['weight_training', 'boxing', 'dance', 'yoga', 'pilates', 'cardio']
  const startHourOptions = Array.from({ length: 16 }, (_, i) => String(6 + i).padStart(2, '0'))
  const endHourOptions = startHour
    ? startHourOptions
        .map(hour => String(Number(hour) + 1).padStart(2, '0'))
        .filter(hour => Number(hour) > Number(startHour))
    : Array.from({ length: 16 }, (_, i) => String(7 + i).padStart(2, '0'))

  useEffect(() => {
    const init = async () => {
      if (id) {
        setLoading(true)
        try {
          const session = await sessionService.getById(id)
          if (session) {
            setTitle(session.title)
            setDescription(session.description || '')
            setCategory(session.category)
            setType(session.type)

            const startDateTime = new Date(session.startTime)
            setSessionDate(startDateTime.toISOString().split('T')[0])
            setStartHour(String(startDateTime.getHours()).padStart(2, '0'))

            const endDateTime = new Date(session.endTime)
            setEndHour(String(endDateTime.getHours()).padStart(2, '0'))

            setCapacity(session.capacity.toString())
            setBranchId(String(session.branchId))
            setTrainerId(String(session.trainerId))
          }
        } catch (err) {
          setError(err instanceof Error ? err.message : 'Failed to load session')
        } finally {
          setLoading(false)
        }
      }

      try {
        const branchesData = await branchService.getAll()
        setBranches(branchesData)
      } catch (err) {
        console.error('Failed to load branches:', err)
      }

      try {
        const trainersData = await trainerService.getAll()
        setTrainers(trainersData)
      } catch (err) {
        console.error('Failed to load trainers:', err)
      }
    }

    init()
  }, [id])

  useEffect(() => {
    const nextHour = String(Math.min(Number(startHour) + 1, 22)).padStart(2, '0')
    if (Number(endHour) <= Number(startHour)) {
      setEndHour(nextHour)
    }
  }, [startHour, endHour])

  useEffect(() => {
    if (type === 'individual') {
      setCapacity('1')
    }
  }, [type])

  useEffect(() => {
    if (branchId) {
      const allowedSpecialties = CATEGORY_SPECIALTY_MAP[category] || []
      const filtered = trainers.filter(trainer =>
        String(trainer.branchId) === String(branchId) &&
        trainer.specialties?.some(specialty => allowedSpecialties.includes(specialty))
      )
      setAvailableTrainers(filtered)
      // Reset trainer selection if current trainer is not in the selected branch or category
      if (trainerId && !filtered.find(t => String(t.id) === String(trainerId))) {
        setTrainerId('')
      }
    } else {
      setAvailableTrainers([])
      setTrainerId('')
    }
  }, [branchId, category, trainers, trainerId])


  const handleSubmit = async () => {
    if (!title.trim()) {
      setError('Title is required')
      return
    }

    if (!category) {
      setError('Category is required')
      return
    }

    if (!branchId.trim()) {
      setError('Branch is required')
      return
    }

    if (!trainerId.trim()) {
      setError('Trainer is required')
      return
    }

    if (!sessionDate) {
      setError('Session date is required')
      return
    }

    const startDateTime = new Date(`${sessionDate}T${startHour}:00:00`)
    const endDateTime = new Date(`${sessionDate}T${endHour}:00:00`)

    if (startDateTime >= endDateTime) {
      setError('End time must be after start time')
      return
    }

    if (startDateTime < new Date()) {
      setError('Start time cannot be in the past')
      return
    }

    setIsSubmitting(true)
    setError(null)

    try {
      const sessionData = {
        title: title.trim(),
        description: description.trim() || undefined,
        category,
        type,
        startTime: startDateTime.toISOString(),
        endTime: endDateTime.toISOString(),
        capacity: parseInt(capacity) || 10,
        branchId,
        trainerId
      }

      if (id) {
        await updateSession(id, sessionData)
      } else {
        await createSession(sessionData as Omit<Session, 'id' | 'createdAt' | 'updatedAt'>)
      }

      navigate('/sessions')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save session')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (loading) return <div className="p-8 text-center">Loading session...</div>

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <button
        onClick={() => navigate('/sessions')}
        className="mb-4 px-3 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 transition"
      >
        ← Back
      </button>

      <h1 className="text-2xl font-bold text-center mb-6 text-gray-800">
        {id ? 'Edit Session' : 'Create New Session'}
      </h1>

      {error && <div className="mb-4 p-3 bg-red-100 text-red-700 rounded">{error}</div>}

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
          <input
            type="text"
            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Session title"
            value={title}
            onChange={e => setTitle(e.target.value)}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
          <textarea
            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Session description"
            value={description}
            onChange={e => setDescription(e.target.value)}
            rows={3}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
          <select
            className="w-full px-4 py-2 border border-gray-300 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={category}
            onChange={e => setCategory(e.target.value as SessionCategory)}
          >
            {categories.map(cat => (
              <option key={cat} value={cat}>
                {cat.replace('_', ' ').charAt(0).toUpperCase() + cat.replace('_', ' ').slice(1)}
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
            <select
              className="w-full px-4 py-2 border border-gray-300 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={type}
              onChange={e => setType(e.target.value as 'group' | 'individual')}
            >
              <option value="individual">Individual</option>
              <option value="group">Group</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Branch</label>
            <select
              className="w-full px-4 py-2 border border-gray-300 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={branchId}
              onChange={e => setBranchId(e.target.value)}
            >
              <option value="">Select a branch</option>
              {Array.from(
                branches
                  .sort((a, b) => a.city.localeCompare(b.city))
                  .reduce((groups, branch) => {
                    const city = branch.city
                    if (!groups.has(city)) groups.set(city, [])
                    groups.get(city)!.push(branch)
                    return groups
                  }, new Map<string, typeof branches>())
              ).map(([city, cityBranches]) => (
                <optgroup key={city} label={city}>
                  {cityBranches.map(branch => (
                    <option key={branch.id} value={branch.id}>
                      {branch.name}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
            <input
              type="date"
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-800"
              value={sessionDate}
              onChange={e => setSessionDate(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Start Hour</label>
            <select
              className="w-full px-4 py-2 border border-gray-300 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={startHour}
              onChange={e => setStartHour(e.target.value)}
            >
              {startHourOptions.map(hour => (
                <option key={hour} value={hour}>
                  {hour}:00
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">End Hour</label>
            <select
              className="w-full px-4 py-2 border border-gray-300 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={endHour}
              onChange={e => setEndHour(e.target.value)}
            >
              {endHourOptions.map(hour => (
                <option key={hour} value={hour}>
                  {hour}:00
                </option>
              ))}
            </select>
            <p className="text-xs text-gray-500 mt-1">End hour is always after start hour</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Capacity
              {type === 'individual' && <span className="text-red-500 ml-2">(Fixed)</span>}
            </label>
            <input
              type="number"
              className={`w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                type === 'individual' ? 'bg-gray-100 cursor-not-allowed' : ''
              }`}
              placeholder="Max participants"
              value={capacity}
              onChange={e => setCapacity(e.target.value)}
              disabled={type === 'individual'}
              min="1"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Trainer</label>
            <select
              className="w-full px-4 py-2 border border-gray-300 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={trainerId}
              onChange={e => setTrainerId(e.target.value)}
              disabled={!branchId}
            >
              <option value="">
                {branchId ? 'Select a trainer' : 'Select branch first'}
              </option>
              {availableTrainers.map(trainer => (
                <option key={trainer.id} value={trainer.id}>
                  {trainer.firstName} {trainer.lastName}
                </option>
              ))}
            </select>
            <p className="text-xs text-gray-500 mt-1">Filtered by branch and session category specialty.</p>
          </div>
        </div>

        <div className="text-right pt-4">
          <button
            onClick={() => navigate('/sessions')}
            className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 transition mr-2"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 transition disabled:opacity-50"
          >
            {isSubmitting ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  )
}
