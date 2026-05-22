import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { memberService } from '../services/memberService'
import { MemberPTPackages } from '../components/MemberPTPackages'
import type { Member } from '../types/Member'

type ActiveTab = 'info' | 'packages'

export const MemberDetail = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [member, setMember] = useState<Member | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<ActiveTab>('info')

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

  const formatDate = (date: string) =>
    new Date(date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })

  const getStatusColor = (status: Member['status']) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800'
      case 'inactive': return 'bg-gray-100 text-gray-800'
      case 'suspended': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
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
        <div className="text-xl text-red-600 mb-4">{error || 'Member not found'}</div>
        <button onClick={() => navigate('/members')} className="text-blue-600 hover:text-blue-800">
          ← Back to Members
        </button>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">

        {/* Header */}
        <div className="mb-6">
          <button
            onClick={() => navigate('/members')}
            className="text-blue-600 hover:text-blue-800 flex items-center gap-2 mb-4"
          >
            ← Back to Members
          </button>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                {member.firstName} {member.lastName}
              </h1>
              <p className="text-gray-600 mt-1">Member ID: {member.id}</p>
            </div>
            <button
              onClick={() => navigate(`/members/${id}/edit`)}
              className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 font-medium"
            >
              Edit Member
            </button>
          </div>
          <div className="mt-3">
            <span className={`inline-block px-4 py-2 rounded-full font-medium text-sm ${getStatusColor(member.status)}`}>
              {member.status.charAt(0).toUpperCase() + member.status.slice(1)}
            </span>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-6 border-b border-gray-200">
          {([
            { key: 'info', label: 'Personal Info' },
            { key: 'packages', label: 'PT Packages' },
          ] as { key: ActiveTab; label: string }[]).map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-5 py-2.5 text-sm font-semibold transition border-b-2 -mb-px ${
                activeTab === tab.key
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab: Personal Info */}
        {activeTab === 'info' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <div className="bg-white rounded-lg shadow-md p-8">
                <h2 className="text-xl font-bold text-gray-900 mb-6">Personal Information</h2>
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">First Name</p>
                    <p className="text-lg font-semibold text-gray-900">{member.firstName}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Last Name</p>
                    <p className="text-lg font-semibold text-gray-900">{member.lastName}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Email</p>
                    <p className="text-lg font-semibold text-gray-900">{member.email || '-'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Phone</p>
                    <p className="text-lg font-semibold text-gray-900">{member.phone || '-'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Gender</p>
                    <p className="text-lg font-semibold text-gray-900">
                      {member.gender ? member.gender.charAt(0).toUpperCase() + member.gender.slice(1) : '-'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Birth Date</p>
                    <p className="text-lg font-semibold text-gray-900">
                      {member.birthDate ? formatDate(member.birthDate) : '-'}
                    </p>
                  </div>
                </div>

                <h3 className="text-xl font-bold text-gray-900 mt-8 mb-6">Physical Information</h3>
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Height</p>
                    <p className="text-lg font-semibold text-gray-900">{member.height ? `${member.height} cm` : '-'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Weight</p>
                    <p className="text-lg font-semibold text-gray-900">{member.weight ? `${member.weight} kg` : '-'}</p>
                  </div>
                </div>

                <h3 className="text-xl font-bold text-gray-900 mt-8 mb-6">Membership Information</h3>
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Membership Type</p>
                    <p className="text-lg font-semibold text-gray-900 capitalize">{member.membershipType}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Duration</p>
                    <p className="text-lg font-semibold text-gray-900">{member.membershipDuration} month(s)</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Join Date</p>
                    <p className="text-lg font-semibold text-gray-900">{formatDate(member.joinDate)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Expiry Date</p>
                    <p className="text-lg font-semibold text-gray-900">{formatDate(member.expiryDate)}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Sidebar */}
            <div>
              <div className="bg-white rounded-lg shadow-md p-6 mb-6">
                <h3 className="text-lg font-bold text-gray-900 mb-4">Quick Actions</h3>
                <div className="space-y-3">
                  <button
                    onClick={() => navigate(`/members/${id}/edit`)}
                    className="w-full bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 font-medium text-sm"
                  >
                    Edit Member
                  </button>
                  <button
                    onClick={() => setActiveTab('packages')}
                    className="w-full bg-emerald-600 text-white px-4 py-2 rounded-md hover:bg-emerald-700 font-medium text-sm"
                  >
                    Manage PT Packages
                  </button>
                  <button
                    onClick={() => {
                      if (window.confirm('Are you sure you want to delete this member?')) {
                        memberService.delete(id!).then(() => {
                          navigate('/members')
                        }).catch((err) => {
                          alert('Failed to delete member: ' + err.message)
                        })
                      }
                    }}
                    className="w-full bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 font-medium text-sm"
                  >
                    Delete Member
                  </button>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-md p-6">
                <h3 className="text-lg font-bold text-gray-900 mb-4">Membership Status</h3>
                <div className="space-y-4">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Current Status</p>
                    <div className={`inline-block px-3 py-1 rounded-full font-medium text-sm ${getStatusColor(member.status)}`}>
                      {member.status.charAt(0).toUpperCase() + member.status.slice(1)}
                    </div>
                  </div>
                  <div className="pt-4 border-t border-gray-200">
                    <p className="text-xs text-gray-500 mb-2">Last Updated</p>
                    <p className="text-sm text-gray-700">
                      {member.updatedAt ? formatDate(member.updatedAt) : 'N/A'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab: PT Packages */}
        {activeTab === 'packages' && (
          <MemberPTPackages
            memberId={member.id}
            memberName={`${member.firstName} ${member.lastName}`}
          />
        )}

      </div>
    </div>
  )
}