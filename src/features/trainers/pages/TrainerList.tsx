import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTrainers } from '../hooks/useTrainers'

export const TrainerList = () => {
  const { trainers, loading, error } = useTrainers()
  const navigate = useNavigate()
  const [searchTerm, setSearchTerm] = useState('')
  const [sortField, setSortField] = useState<string>('firstName')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc')

  const filteredAndSortedTrainers = useMemo(() => {
    let filtered = trainers.filter(trainer => {
      const searchLower = searchTerm.toLowerCase()
      return (
        trainer.firstName.toLowerCase().includes(searchLower) ||
        trainer.lastName.toLowerCase().includes(searchLower) ||
        trainer.employmentType?.toLowerCase().includes(searchLower) ||
        trainer.specialties?.some(s => s.toLowerCase().includes(searchLower)) ||
        trainer.branchName?.toLowerCase().includes(searchLower) ||
        (trainer.active ? 'active' : 'inactive').includes(searchLower)
      )
    })

    filtered.sort((a, b) => {
      let aValue: any
      let bValue: any

      switch (sortField) {
        case 'name':
          aValue = `${a.firstName} ${a.lastName}`.toLowerCase()
          bValue = `${b.firstName} ${b.lastName}`.toLowerCase()
          break
        case 'employmentType':
          aValue = a.employmentType || ''
          bValue = b.employmentType || ''
          break
        case 'specialties':
          aValue = a.specialties?.join(', ') || ''
          bValue = b.specialties?.join(', ') || ''
          break
        case 'branchName':
          aValue = a.branchName || ''
          bValue = b.branchName || ''
          break
        case 'active':
          aValue = a.active
          bValue = b.active
          break
        default:
          aValue = a.firstName.toLowerCase()
          bValue = b.firstName.toLowerCase()
      }

      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1
      return 0
    })

    return filtered
  }, [trainers, searchTerm, sortField, sortDirection])

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('asc')
    }
  }

  const getSortIcon = (field: string) => {
    if (sortField !== field) return '↕️'
    return sortDirection === 'asc' ? '↑' : '↓'
  }

  if (loading) return <div className="p-8 text-center">Loading trainers...</div>
  if (error) return <div className="p-8 text-center text-red-500">Error: {error}</div>

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold text-center mb-6 text-gray-800">Trainers</h1>

      <div className="mb-6 flex justify-between items-center">
        <button 
          onClick={() => navigate('/trainers/new')}
          className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 transition"
        >
          Add Trainer
        </button>
        
        <input
          type="text"
          placeholder="Search trainers..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <table className="w-full border-collapse border border-gray-300">
        <thead>
          <tr className="bg-gray-100">
            <th 
              className="border border-gray-300 p-3 text-left font-semibold cursor-pointer hover:bg-gray-200"
              onClick={() => handleSort('name')}
            >
              Name {getSortIcon('name')}
            </th>
            <th 
              className="border border-gray-300 p-3 text-left font-semibold cursor-pointer hover:bg-gray-200"
              onClick={() => handleSort('employmentType')}
            >
              Employment {getSortIcon('employmentType')}
            </th>
            <th 
              className="border border-gray-300 p-3 text-left font-semibold cursor-pointer hover:bg-gray-200"
              onClick={() => handleSort('specialties')}
            >
              Specialties {getSortIcon('specialties')}
            </th>
            <th 
              className="border border-gray-300 p-3 text-left font-semibold cursor-pointer hover:bg-gray-200"
              onClick={() => handleSort('branchName')}
            >
              Branch {getSortIcon('branchName')}
            </th>
            <th 
              className="border border-gray-300 p-3 text-left font-semibold cursor-pointer hover:bg-gray-200"
              onClick={() => handleSort('active')}
            >
              Status {getSortIcon('active')}
            </th>
          </tr>
        </thead>
        <tbody>
          {filteredAndSortedTrainers.map(trainer => (
            <tr
              key={trainer.id}
              onClick={() => navigate(`/trainers/${trainer.id}`)}
              className="hover:bg-gray-50 cursor-pointer"
            >
              <td className="border border-gray-300 p-3">{trainer.firstName} {trainer.lastName}</td>
              <td className="border border-gray-300 p-3">{trainer.employmentType}</td>
              <td className="border border-gray-300 p-3">{trainer.specialties?.join(', ') || 'N/A'}</td>
              <td className="border border-gray-300 p-3">{trainer.branchName || 'N/A'}</td>
              <td className="border border-gray-300 p-3">{trainer.active ? 'Active' : 'Inactive'}</td>
            </tr>
          ))}
        </tbody>
      </table>
      
      {filteredAndSortedTrainers.length === 0 && searchTerm && (
        <div className="text-center mt-4 text-gray-500">
          No trainers found matching "{searchTerm}"
        </div>
      )}
    </div>
  )
}