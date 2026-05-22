// src/features/members/components/MemberForm.tsx
import { useState, type FormEvent } from 'react'
import type { Member } from '../types/Member'

interface MemberFormProps {
  initialData?: Member  // Add this - optional for edit mode
  onSubmit: (member: Omit<Member, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>
  onCancel: () => void
}

interface FormErrors {
  firstName?: string
  lastName?: string
  email?: string
  phone?: string
  birthDate?: string
  height?: string
  weight?: string
}

export const MemberForm = ({ initialData, onSubmit, onCancel }: MemberFormProps) => {
  // Form state - pre-fill with initialData if editing
  const [firstName, setFirstName] = useState(initialData?.firstName || '')
  const [lastName, setLastName] = useState(initialData?.lastName || '')
  const [email, setEmail] = useState(initialData?.email || '')
  const [phone, setPhone] = useState(initialData?.phone || '')
  const [birthDate, setBirthDate] = useState(initialData?.birthDate || '')
  const [gender, setGender] = useState<'male' | 'female'>(initialData?.gender || 'male')
  const [membershipType, setMembershipType] = useState<'basic' | 'ultra'>(initialData?.membershipType || 'basic')
  const [membershipDuration, setMembershipDuration] = useState(initialData?.membershipDuration || 1)
  const [status, setStatus] = useState<'active' | 'inactive' | 'suspended'>(initialData?.status || 'active')
  const [height, setHeight] = useState(initialData?.height?.toString() || '')
  const [weight, setWeight] = useState(initialData?.weight?.toString() || '')
  
  // Validation & submission state
  const [errors, setErrors] = useState<FormErrors>({})
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Validation function
  const validate = (): boolean => {
    const newErrors: FormErrors = {}

    // First Name - required, min 2 chars
    if (!firstName.trim()) {
      newErrors.firstName = 'First name is required'
    } else if (firstName.trim().length < 2) {
      newErrors.firstName = 'First name must be at least 2 characters'
    }

    // Last Name - required, min 2 chars
    if (!lastName.trim()) {
      newErrors.lastName = 'Last name is required'
    } else if (lastName.trim().length < 2) {
      newErrors.lastName = 'Last name must be at least 2 characters'
    }

    // Email - optional but must be valid if provided
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      newErrors.email = 'Please enter a valid email address'
    }

    // Phone - optional but must be valid if provided
    if (phone && !/^[\d\s\-\+\(\)]+$/.test(phone)) {
      newErrors.phone = 'Please enter a valid phone number'
    }

    // Birth Date - optional but must be valid date and not in future
    if (birthDate) {
      const selectedDate = new Date(birthDate)
      const today = new Date()
      if (selectedDate > today) {
        newErrors.birthDate = 'Birth date cannot be in the future'
      }
      // Check if person is at least 10 years old
      const tenYearsAgo = new Date()
      tenYearsAgo.setFullYear(today.getFullYear() - 10)
      if (selectedDate > tenYearsAgo) {
        newErrors.birthDate = 'Member must be at least 10 years old'
      }
    }

    // Height - optional but must be positive if provided
    if (height && (parseFloat(height) <= 0 || parseFloat(height) > 300)) {
      newErrors.height = 'Height must be between 1-300 cm'
    }

    // Weight - optional but must be positive if provided
    if (weight && (parseFloat(weight) <= 0 || parseFloat(weight) > 500)) {
      newErrors.weight = 'Weight must be between 1-500 kg'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  // Handle form submission
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    
    // Validate before submitting
    if (!validate()) {
      return
    }

    setIsSubmitting(true)
    try {
      const memberData: Omit<Member, 'id' | 'createdAt' | 'updatedAt'> = {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.trim() || undefined,
        phone: phone.trim() || undefined,
        birthDate: birthDate || undefined,
        gender,
        membershipType,
        membershipDuration,
        status,
        height: height ? parseFloat(height) : undefined,
        weight: weight ? parseFloat(weight) : undefined,
        joinDate: initialData?.joinDate || new Date().toISOString().split('T')[0],
        expiryDate: initialData?.expiryDate || new Date(new Date().setMonth(new Date().getMonth() + membershipDuration)).toISOString().split('T')[0],
      }

      await onSubmit(memberData)
    } catch (error) {
      console.error('Form submission error:', error)
      alert('An unexpected error occurred')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Name Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* First Name */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            First Name *
          </label>
          <input
            type="text"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            className={`w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              errors.firstName ? 'border-red-500' : 'border-gray-300'
            }`}
            placeholder="John"
          />
          {errors.firstName && <p className="text-red-500 text-sm mt-1">{errors.firstName}</p>}
        </div>

        {/* Last Name */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Last Name *
          </label>
          <input
            type="text"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            className={`w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              errors.lastName ? 'border-red-500' : 'border-gray-300'
            }`}
            placeholder="Doe"
          />
          {errors.lastName && <p className="text-red-500 text-sm mt-1">{errors.lastName}</p>}
        </div>
      </div>

      {/* Contact Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Email */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Email
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={`w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              errors.email ? 'border-red-500' : 'border-gray-300'
            }`}
            placeholder="john@example.com"
          />
          {errors.email && <p className="text-red-500 text-sm mt-1">{errors.email}</p>}
        </div>

        {/* Phone */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Phone
          </label>
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className={`w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              errors.phone ? 'border-red-500' : 'border-gray-300'
            }`}
            placeholder="+62 812-3456-7890"
          />
          {errors.phone && <p className="text-red-500 text-sm mt-1">{errors.phone}</p>}
        </div>
      </div>

      {/* Personal Information Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Birth Date */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Birth Date
          </label>
          <input
            type="date"
            value={birthDate}
            onChange={(e) => setBirthDate(e.target.value)}
            className={`w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              errors.birthDate ? 'border-red-500' : 'border-gray-300'
            }`}
          />
          {errors.birthDate && <p className="text-red-500 text-sm mt-1">{errors.birthDate}</p>}
        </div>

        {/* Gender */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Gender
          </label>
          <select
            value={gender}
            onChange={(e) => setGender(e.target.value as 'male' | 'female')}
            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="male">Male</option>
            <option value="female">Female</option>
          </select>
        </div>
      </div>

      {/* Membership Section */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Membership Type */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Membership Type
          </label>
          <select
            value={membershipType}
            onChange={(e) => setMembershipType(e.target.value as 'basic' | 'ultra')}
            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="basic">Basic</option>
            <option value="ultra">Ultra</option>
          </select>
        </div>

        {/* Membership Duration */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Duration (Months)
          </label>
          <input
            type="number"
            min="1"
            max="36"
            value={membershipDuration}
            onChange={(e) => setMembershipDuration(parseInt(e.target.value))}
            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Status */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Status
          </label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as 'active' | 'inactive' | 'suspended')}
            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="suspended">Suspended</option>
          </select>
        </div>
      </div>

      {/* Physical Information Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Height */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Height (cm)
          </label>
          <input
            type="number"
            step="0.1"
            value={height}
            onChange={(e) => setHeight(e.target.value)}
            className={`w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              errors.height ? 'border-red-500' : 'border-gray-300'
            }`}
            placeholder="170"
          />
          {errors.height && <p className="text-red-500 text-sm mt-1">{errors.height}</p>}
        </div>

        {/* Weight */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Weight (kg)
          </label>
          <input
            type="number"
            step="0.1"
            value={weight}
            onChange={(e) => setWeight(e.target.value)}
            className={`w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              errors.weight ? 'border-red-500' : 'border-gray-300'
            }`}
            placeholder="75"
          />
          {errors.weight && <p className="text-red-500 text-sm mt-1">{errors.weight}</p>}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-4 pt-6">
        <button
          type="submit"
          disabled={isSubmitting}
          className="flex-1 bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 disabled:bg-blue-400 font-medium transition"
        >
          {isSubmitting ? 'Saving...' : 'Save Member'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 border border-gray-300 text-gray-700 px-6 py-2 rounded-md hover:bg-gray-50 font-medium transition"
        >
          Cancel
        </button>
      </div>
    </form>
  )
}
