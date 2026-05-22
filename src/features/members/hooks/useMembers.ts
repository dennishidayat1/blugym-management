// src/features/members/hooks/useMembers.ts
import { useState, useEffect } from 'react'
import { memberService } from '../services/memberService'
import type { Member } from '../types/Member'

export const useMembers = () => {
  const [members, setMembers] = useState<Member[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Fetch all members on mount
  useEffect(() => {
    fetchMembers()
  }, [])

  const fetchMembers = async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await memberService.getAll()
      setMembers(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch members')
    } finally {
      setLoading(false)
    }
  }

  const addMember = async (member: Omit<Member, 'id' | 'createdAt' | 'updatedAt'>) => {
    try {
      setError(null)
      const newMember = await memberService.create(member)
      setMembers(prev => [newMember, ...prev])
      return newMember
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to add member'
      setError(errorMsg)
      throw new Error(errorMsg)
    }
  }

  const updateMember = async (id: string, updates: Partial<Member>) => {
    try {
      setError(null)
      const updated = await memberService.update(id, updates)
      setMembers(prev => prev.map(m => m.id === id ? updated : m))
      return updated
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to update member'
      setError(errorMsg)
      throw new Error(errorMsg)
    }
  }

  const deleteMember = async (id: string) => {
    try {
      setError(null)
      await memberService.delete(id)
      setMembers(prev => prev.filter(m => m.id !== id))
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to delete member'
      setError(errorMsg)
      throw new Error(errorMsg)
    }
  }

  const refreshMembers = () => {
    fetchMembers()
  }

  return {
    members,
    loading,
    error,
    addMember,
    updateMember,
    deleteMember,
    refreshMembers
  }
}
