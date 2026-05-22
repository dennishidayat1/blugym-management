// src/features/members/pages/Members.tsx
import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMembers } from '../hooks/useMembers'
import type { Member } from '../types/Member'

type SortOption = 'name' | 'status' | 'expiryDate' | 'height' | 'weight'
type StatusFilter = 'all' | 'active' | 'inactive' | 'suspended'
type GenderFilter = 'all' | 'male' | 'female' | 'other'

export const Members = () => {
  const navigate = useNavigate()
  const { members, loading, error, updateMember } = useMembers()
  
  // Filter & Sort State
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [genderFilter, setGenderFilter] = useState<GenderFilter>('all')
  const [sortBy, setSortBy] = useState<SortOption>('status')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc')

  // Filtered and sorted members
  const filteredMembers = useMemo(() => {
    let result = [...members]

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      result = result.filter(member => 
        member.firstName.toLowerCase().includes(query) ||
        member.lastName.toLowerCase().includes(query) ||
        member.email?.toLowerCase().includes(query) ||
        member.phone?.includes(query)
      )
    }

    // Status filter
    if (statusFilter !== 'all') {
      result = result.filter(member => member.status === statusFilter)
    }

    // Gender filter
    if (genderFilter !== 'all') {
      result = result.filter(member => member.gender === genderFilter)
    }

    // Sort
    result.sort((a, b) => {
      let comparison = 0
      
      switch (sortBy) {
        case 'name':
          comparison = `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`)
          break
        case 'status':
          const statusOrder = { active: 1, inactive: 2, suspended: 3 }
          comparison = statusOrder[a.status] - statusOrder[b.status]
          break
        case 'expiryDate':
          comparison = new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime()
          break
        case 'height':
          comparison = (a.height || 0) - (b.height || 0)
          break
        case 'weight':
          comparison = (a.weight || 0) - (b.weight || 0)
          break
      }
      
      return sortOrder === 'asc' ? comparison : -comparison
    })

    return result
  }, [members, searchQuery, statusFilter, genderFilter, sortBy, sortOrder])

  // Handle status change
  const handleStatusChange = async (memberId: string, newStatus: Member['status']) => {
    if (window.confirm(`Change member status to ${newStatus}?`)) {
      try {
        await updateMember(memberId, { status: newStatus })
      } catch (error) {
        console.error('Failed to update status:', error)
        alert('Failed to update status')
      }
    }
  }

  // Handle column sort
  const handleSort = (column: SortOption) => {
    if (sortBy === column) {
      // Toggle sort order if clicking same column
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      // Set new column and default to ascending
      setSortBy(column)
      setSortOrder('asc')
    }
  }

  // Sort arrow component
  const SortArrow = ({ column }: { column: SortOption }) => {
    if (sortBy !== column) return <span className="ml-1">⇅</span>
    return <span className="ml-1">{sortOrder === 'asc' ? '↑' : '↓'}</span>
  }

  // Get status badge color
  const getStatusColor = (status: Member['status']) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800'
      case 'inactive':
        return 'bg-gray-100 text-gray-800'
      case 'suspended':
        return 'bg-red-100 text-red-800'
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-xl">Loading members...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4">
        {/* Header with Add Button */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Members</h1>
            <p className="text-gray-600 mt-2">Manage all gym members</p>
          </div>
          <button
            onClick={() => navigate('/members/new')}
            className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 font-medium"
          >
            + Add Member
          </button>
        </div>

        {/* Filters & Search */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          {/* Search Bar */}
          <div className="mb-6">
            <input
              type="text"
              placeholder="Search by name, email or phone..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Filter Row */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Status Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="suspended">Suspended</option>
              </select>
            </div>

            {/* Gender Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Gender</label>
              <select
                value={genderFilter}
                onChange={(e) => setGenderFilter(e.target.value as GenderFilter)}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
              </select>
            </div>

            {/* Sort */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Sort By</label>
              <select
                value={sortBy}
                onChange={(e) => handleSort(e.target.value as SortOption)}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="status">Status</option>
                <option value="name">Name</option>
                <option value="expiryDate">Expiry Date</option>
                <option value="height">Height</option>
                <option value="weight">Weight</option>
              </select>
            </div>
          </div>

          {/* Results count */}
          <div className="mt-4 text-sm text-gray-600">
            Showing {filteredMembers.length} of {members.length} members
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md mb-6">
            {error}
          </div>
        )}

        {/* Table */}
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          {filteredMembers.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              No members found
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-100 border-b">
                  <tr>
                    <th
                      onClick={() => handleSort('name')}
                      className="px-6 py-3 text-left text-sm font-semibold text-gray-700 cursor-pointer hover:bg-gray-200"
                    >
                      Name <SortArrow column="name" />
                    </th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Email</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Phone</th>
                    <th
                      onClick={() => handleSort('status')}
                      className="px-6 py-3 text-left text-sm font-semibold text-gray-700 cursor-pointer hover:bg-gray-200"
                    >
                      Status <SortArrow column="status" />
                    </th>
                    <th
                      onClick={() => handleSort('expiryDate')}
                      className="px-6 py-3 text-left text-sm font-semibold text-gray-700 cursor-pointer hover:bg-gray-200"
                    >
                      Expiry Date <SortArrow column="expiryDate" />
                    </th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredMembers.map((member) => (
                    <tr key={member.id} className="hover:bg-gray-50 transition">
                      <td className="px-6 py-4">
                        <div className="font-medium text-gray-900">
                          {member.firstName} {member.lastName}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">{member.email || '-'}</td>
                      <td className="px-6 py-4 text-sm text-gray-600">{member.phone || '-'}</td>
                      <td className="px-6 py-4">
                        <select
                          value={member.status}
                          onChange={(e) => handleStatusChange(member.id, e.target.value as Member['status'])}
                          className={`px-3 py-1 rounded-full text-sm font-medium cursor-pointer border-0 ${getStatusColor(member.status)}`}
                        >
                          <option value="active">Active</option>
                          <option value="inactive">Inactive</option>
                          <option value="suspended">Suspended</option>
                        </select>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {new Date(member.expiryDate).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <button
                          onClick={() => navigate(`/members/${member.id}`)}
                          className="text-blue-600 hover:text-blue-800 font-medium"
                        >
                          View Details
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
