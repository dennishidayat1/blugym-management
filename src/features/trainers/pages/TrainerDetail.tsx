import { useParams, useNavigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { trainerService } from '../services/trainerService'
import type { Trainer } from '../models/trainer'

export const TrainerDetail = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const [trainer, setTrainer] = useState<Trainer | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const loadTrainer = async () => {
      if (!id) {
        setError('Trainer ID not found')
        setLoading(false)
        return
      }

      try {
        setLoading(true)
        const data = await trainerService.getById(id)
        if (data) {
          setTrainer(data)
        } else {
          setError('Trainer not found')
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load trainer')
      } finally {
        setLoading(false)
      }
    }

    loadTrainer()
  }, [id])

  if (loading) return <div className="p-8 text-center">Loading trainer...</div>
  if (error) return <div className="p-8 text-center text-red-500">Error: {error}</div>
  if (!trainer) return <div className="p-8 text-center">Trainer not found</div>

  return (
    <div className="p-8">
      <button
        onClick={() => navigate('/trainers')}
        className="mb-4 px-3 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 transition flex items-center"
      >
        ← Back
      </button>
      <h1 className="text-3xl font-bold mb-6">{trainer.firstName} {trainer.lastName}</h1>

      <div className="space-y-2">
        <p><strong>Email:</strong> {trainer.email || 'N/A'}</p>
        <p><strong>Phone:</strong> {trainer.phone || 'N/A'}</p>
        <p><strong>Employment:</strong> {trainer.employmentType}</p>
        <p><strong>Specialties:</strong> {trainer.specialties?.join(', ') || 'N/A'}</p>
        <p><strong>Hire Date:</strong> {trainer.hireDate || 'N/A'}</p>
        <p><strong>Status:</strong> {trainer.active ? 'Active' : 'Inactive'}</p>
      </div>

      <hr className="my-6" />

      <h2 className="text-2xl font-semibold mb-4">Upcoming Sessions</h2>
      <p>No sessions yet</p>
    </div>
  )
}