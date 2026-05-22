// src/features/members/pages/EditMember.tsx
import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { memberService } from '../services/memberService'
import { MemberForm } from '../components/MemberForm'
import type { Member } from '../types/Member'

export const EditMember = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [member, setMember] = useState<Member | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchMember = async () => {
      if (!id) return
      
      try {
        setLoading(true)
        const data = await memberService.getById(id)
        setMember(data)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load member')
      } finally {
        setLoading(false)
      }
    }

    fetchMember()
  }, [id])

  const handleUpdateMember = async (memberData: Omit<Member, 'id' | 'createdAt' | 'updatedAt'>) => {
    if (!id) return

    try {
      await memberService.update(id, memberData)
      navigate('/members')  // Go back to members list after edit
    } catch (error) {
      console.error('Failed to update member:', error)
      alert('Failed to update member. Please try again.')
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-xl">Loading member details...</div>
      </div>
    )
  }

  if (error || !member) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <div className="text-xl text-red-600 mb-4">
          {error || 'Member not found'}
        </div>
        <button
          onClick={() => navigate('/members')}
          className="text-blue-600 hover:text-blue-800"
        >
          ← Back to Members
        </button>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-2xl mx-auto px-4">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => navigate(`/members/${id}`)}
            className="text-blue-600 hover:text-blue-800 flex items-center gap-2 mb-4"
          >
            ← Back to Member Details
          </button>
          <h1 className="text-3xl font-bold text-gray-900">Edit Member</h1>
          <p className="text-gray-600 mt-2">
            Update information for {member.firstName} {member.lastName}
          </p>
        </div>

        {/* Form Card */}
        <div className="bg-white rounded-lg shadow-md p-8">
          <MemberForm
            initialData={member}
            onSubmit={handleUpdateMember}
            onCancel={() => navigate(`/members/${id}`)}
          />
        </div>
      </div>
    </div>
  )
}
