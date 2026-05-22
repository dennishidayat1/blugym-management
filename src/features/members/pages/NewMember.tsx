// src/features/members/pages/NewMember.tsx
import { useNavigate } from 'react-router-dom'
import { useMembers } from '../hooks/useMembers'
import { MemberForm } from '../components/MemberForm'
import type { Member } from '../types/Member'

export const NewMember = () => {
  const navigate = useNavigate()
  const { addMember } = useMembers()

  const handleAddMember = async (memberData: Omit<Member, 'id' | 'createdAt' | 'updatedAt'>) => {
    try {
      await addMember(memberData)
      // Navigate back to members list after successful add
      navigate('/members')
    } catch (error) {
      console.error('Failed to add member:', error)
      // Error handling is already in the form
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-2xl mx-auto px-4">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => navigate('/members')}
            className="text-blue-600 hover:text-blue-800 flex items-center gap-2 mb-4"
          >
            ← Back to Members
          </button>
          <h1 className="text-3xl font-bold text-gray-900">Add New Member</h1>
          <p className="text-gray-600 mt-2">Fill in the details to add a new gym member</p>
        </div>

        {/* Form Card */}
        <div className="bg-white rounded-lg shadow-md p-8">
          <MemberForm
            onSubmit={handleAddMember}
            onCancel={() => navigate('/members')}
          />
        </div>
      </div>
    </div>
  )
}
