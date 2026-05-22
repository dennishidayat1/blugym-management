import { useState, useEffect } from 'react'
import { trainerService } from '../services/trainerService'
import type { Trainer } from '../models/trainer'

export const useTrainers = () => {
  const [trainers, setTrainers] = useState<Trainer[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadTrainers()
  }, [])

  const loadTrainers = async () => {
    try {
      setLoading(true)
      const data = await trainerService.getAll()
      setTrainers(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load trainers')
    } finally {
      setLoading(false)
    }
  }

  const addTrainer = async (trainer: Omit<Trainer, 'id' | 'createdAt' | 'updatedAt'>) => {
    try {
      const newTrainer = await trainerService.create(trainer)
      setTrainers(prev => [newTrainer, ...prev])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add trainer')
    }
  }

  return {
    trainers,
    loading,
    error,
    addTrainer,
    refreshTrainers: loadTrainers
  }
}