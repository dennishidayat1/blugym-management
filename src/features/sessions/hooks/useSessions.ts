import { useState, useEffect } from 'react'
import { sessionService } from '../services/sessionService'
import type { Session } from '../models/session'

export const useSessions = () => {
  const [sessions, setSessions] = useState<Session[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadSessions()
  }, [])

  const loadSessions = async () => {
    try {
      setLoading(true)
      const data = await sessionService.getAll()
      setSessions(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load sessions')
    } finally {
      setLoading(false)
    }
  }

  const createSession = async (session: Omit<Session, 'id' | 'createdAt' | 'updatedAt'>) => {
    try {
      const newSession = await sessionService.create(session)
      setSessions(prev => [newSession, ...prev])
      return newSession
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create session')
      throw err
    }
  }

  const updateSession = async (id: string, updates: Partial<Session>) => {
    try {
      const updated = await sessionService.update(id, updates)
      setSessions(prev => prev.map(s => s.id === id ? updated : s))
      return updated
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update session')
      throw err
    }
  }

  const deleteSession = async (id: string) => {
    try {
      await sessionService.delete(id)
      setSessions(prev => prev.filter(s => s.id !== id))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete session')
      throw err
    }
  }

  const enrollMember = async (sessionId: string, memberId: string) => {
    try {
      return await sessionService.enrollMember(sessionId, memberId)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to enroll member')
      throw err
    }
  }

  const unenrollMember = async (enrollmentId: string) => {
    try {
      await sessionService.unenrollMember(enrollmentId)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to unenroll member')
      throw err
    }
  }

  return {
    sessions,
    loading,
    error,
    loadSessions,
    createSession,
    updateSession,
    deleteSession,
    enrollMember,
    unenrollMember
  }
}
