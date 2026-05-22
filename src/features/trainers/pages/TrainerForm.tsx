import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTrainers } from '../hooks/useTrainers'
import { branchService } from '../../../shared/services/branchService'
import { specialtyService } from '../services/specialtyService.ts'
import type { Branch } from '../../../shared/models/Branch'
import type { Specialty } from '../models/specialty.ts'

export const TrainerForm = () => {
  const navigate = useNavigate()
  const { addTrainer } = useTrainers()

  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [employmentType, setEmploymentType] = useState<'fulltime' | 'parttime'>('fulltime')
  const [selectedSpecialties, setSelectedSpecialties] = useState<string[]>([])
  const [specialtyOptions, setSpecialtyOptions] = useState<Specialty[]>([])
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [branchId, setBranchId] = useState('')
  const [branches, setBranches] = useState<Branch[]>([])
  const [hireDate, setHireDate] = useState(() => {
    const today = new Date()
    return today.toISOString().split('T')[0]
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async () => {
    if (!firstName.trim() || !lastName.trim()) {
      setError('First name and last name are required.')
      return
    }

    if (!branchId) {
      setError('Branch is required.')
      return
    }

    if (!selectedSpecialties.length) {
      setError('At least one specialty is required.')
      return
    }

    // Email validation
    if (email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError('Please enter a valid email address.')
      return
    }

    // Phone validation (basic check for digits, spaces, hyphens, parentheses, plus)
    if (phone.trim() && !/^[\d\s\-\(\)\+]+$/.test(phone.trim())) {
      setError('Please enter a valid phone number.')
      return
    }

    // Hire date validation (should not be in the future)
    if (hireDate) {
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const hireDateObj = new Date(hireDate)
      if (hireDateObj > today) {
        setError('Hire date cannot be in the future.')
        return
      }
    }

    setIsSubmitting(true)
    setError(null)

    try {
      const newTrainer = {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.trim() || undefined,
        phone: phone.trim() || undefined,
        employmentType,
        specialties: selectedSpecialties,
        hireDate: hireDate ? hireDate : undefined,
        branchId,
        active: true
      }

      console.log('Submitting trainer:', newTrainer)
      await addTrainer(newTrainer)
      navigate('/trainers')
    } catch (err) {
      console.error('Submission error:', err)
      setError(err instanceof Error ? err.message : 'Failed to save trainer')
    } finally {
      setIsSubmitting(false)
    }
  }

  useEffect(() => {
    const loadBranches = async () => {
      try {
        const data = await branchService.getAll()
        setBranches(data)
      } catch (err) {
        console.error('Failed to load branches:', err)
      }
    }

    const loadSpecialties = async () => {
      try {
        const data = await specialtyService.getAll()
        setSpecialtyOptions(data)
      } catch (err) {
        console.error('Failed to load specialties:', err)
      }
    }

    loadBranches()
    loadSpecialties()
  }, [])

  return (
    <div className="p-8 max-w-md mx-auto">
      <button
        onClick={() => navigate('/trainers')}
        className="mb-4 px-3 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 transition flex items-center"
      >
        ← Back
      </button>
      <h1 className="text-2xl font-bold text-center mb-6 text-gray-800">Add Trainer</h1>

      {error && <div className="mb-4 p-3 bg-red-100 text-red-700 rounded">{error}</div>}

      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">First Name</label>
            <input
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="First Name"
              value={firstName}
              onChange={e => setFirstName(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Last Name</label>
            <input
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Last Name"
              value={lastName}
              onChange={e => setLastName(e.target.value)}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              type="email"
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Email"
              value={email}
              onChange={e => setEmail(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
            <input
              type="tel"
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Phone"
              value={phone}
              onChange={e => setPhone(e.target.value)}
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Employment Type</label>
          <select
            className="w-full px-4 py-2 border border-gray-300 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={employmentType}
            onChange={e => setEmploymentType(e.target.value as any)}
          >
            <option value="fulltime">Fulltime</option>
            <option value="parttime">Parttime</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Specialties</label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {specialtyOptions.map(option => (
              <label key={option.id} className="inline-flex items-center gap-2 text-sm text-gray-700">
                <input
                  type="checkbox"
                  value={option.name}
                  checked={selectedSpecialties.includes(option.name)}
                  onChange={e => {
                    const value = e.target.value
                    setSelectedSpecialties(prev =>
                      prev.includes(value)
                        ? prev.filter(item => item !== value)
                        : [...prev, value]
                    )
                  }}
                  className="h-4 w-4 text-blue-600 border-gray-300 rounded"
                />
                {option.name}
              </label>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Branch</label>
          <select
            className="w-full px-4 py-2 border border-gray-300 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={branchId}
            onChange={e => setBranchId(e.target.value)}
          >
            <option value="">Select a branch</option>
            {branches.map(branch => (
              <option key={branch.id} value={branch.id}>{branch.name}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Hire Date</label>
          <input
            type="date"
            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={hireDate}
            onChange={e => setHireDate(e.target.value)}
          />
        </div>

        <div className="text-right">
          <button
            onClick={() => navigate('/trainers')}
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