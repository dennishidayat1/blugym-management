import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSessions } from '../hooks/useSessions'
import { sessionService } from '../services/sessionService'
import type { SessionEnrollment } from '../models/session'

export const SessionEnrollmentPage = () => {
  const navigate = useNavigate()
  const { sessions, loading, error, enrollMember, unenrollMember } = useSessions()
  const [myEnrollments, setMyEnrollments] = useState<SessionEnrollment[]>([])
  const [enrollmentLoading, setEnrollmentLoading] = useState(false)

  // For demo purposes, using a hardcoded member ID
  // In a real app, this would come from authentication
  const memberId = 'demo-member-id'

  useEffect(() => {
    loadMyEnrollments()
  }, [])

  const loadMyEnrollments = async () => {
    try {
      const enrollments = await sessionService.getMemberEnrollments(memberId)
      setMyEnrollments(enrollments)
    } catch (err) {
      console.error('Failed to load enrollments:', err)
    }
  }

  const handleEnroll = async (sessionId: string) => {
    try {
      setEnrollmentLoading(true)
      await enrollMember(sessionId, memberId)
      await loadMyEnrollments() // Refresh enrollments
    } catch (err) {
      console.error('Failed to enroll:', err)
    } finally {
      setEnrollmentLoading(false)
    }
  }

  const handleUnenroll = async (enrollmentId: string) => {
    try {
      setEnrollmentLoading(true)
      await unenrollMember(enrollmentId)
      await loadMyEnrollments() // Refresh enrollments
    } catch (err) {
      console.error('Failed to unenroll:', err)
    } finally {
      setEnrollmentLoading(false)
    }
  }

  const isEnrolled = (sessionId: string) => {
    return myEnrollments.some(e => e.sessionId === sessionId && e.status === 'active')
  }

  const getEnrollmentId = (sessionId: string) => {
    const enrollment = myEnrollments.find(e => e.sessionId === sessionId && e.status === 'active')
    return enrollment?.id
  }

  const formatDateTime = (dateTime: string) => {
    const date = new Date(dateTime)
    return date.toLocaleString()
  }

  const availableSessions = sessions.filter(session =>
    new Date(session.startTime) > new Date() &&
    (!session.capacity || (session.enrolled ?? 0) < session.capacity)
  )

  if (loading) return <div className="p-8 text-center">Loading sessions...</div>
  if (error) return <div className="p-8 text-center text-red-500">Error: {error}</div>

  return (
    <div className="p-8">
      <button
        onClick={() => navigate('/')}
        className="mb-4 px-3 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 transition"
      >
        ← Back to Dashboard
      </button>

      <h1 className="text-3xl font-bold text-center mb-6 text-gray-800">Available Sessions</h1>

      {/* My Enrolled Sessions */}
      {myEnrollments.length > 0 && (
        <div className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">My Sessions</h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {myEnrollments
              .filter(e => e.status === 'active')
              .map(enrollment => {
                const session = sessions.find(s => s.id === enrollment.sessionId)
                if (!session) return null

                return (
                  <div key={enrollment.id} className="border border-gray-300 rounded-lg p-4 bg-green-50">
                    <h3 className="font-semibold text-lg">{session.title}</h3>
                    <p className="text-sm text-gray-600 mb-2">{session.description}</p>
                    <p className="text-sm"><strong>Category:</strong> {session.category.replace('_', ' ')}</p>
                    <p className="text-sm"><strong>Type:</strong> {session.type}</p>
                    <p className="text-sm"><strong>Branch:</strong> {session.branchName && session.branchCity ? `${session.branchName} (${session.branchCity})` : 'TBD'}</p>
                    <p className="text-sm"><strong>Start:</strong> {formatDateTime(session.startTime)}</p>
                    <p className="text-sm"><strong>End:</strong> {formatDateTime(session.endTime)}</p>
                    <button
                      onClick={() => handleUnenroll(enrollment.id)}
                      disabled={enrollmentLoading}
                      className="mt-3 px-3 py-1 bg-red-500 text-white text-sm rounded hover:bg-red-600 transition disabled:opacity-50"
                    >
                      Unenroll
                    </button>
                  </div>
                )
              })}
          </div>
        </div>
      )}

      {/* Available Sessions */}
      <h2 className="text-2xl font-semibold mb-4">Available Sessions</h2>

      {availableSessions.length === 0 ? (
        <p className="text-center text-gray-600">No available sessions at the moment</p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {availableSessions.map(session => (
            <div key={session.id} className="border border-gray-300 rounded-lg p-4 hover:shadow-md transition">
              <h3 className="font-semibold text-lg">{session.title}</h3>
              <p className="text-sm text-gray-600 mb-2">{session.description}</p>
              <p className="text-sm"><strong>Category:</strong> {session.category.replace('_', ' ')}</p>
              <p className="text-sm"><strong>Type:</strong> {session.type}</p>
              <p className="text-sm"><strong>Branch:</strong> {session.branchName && session.branchCity ? `${session.branchName} (${session.branchCity})` : 'TBD'}</p>
              <p className="text-sm"><strong>Start:</strong> {formatDateTime(session.startTime)}</p>
              <p className="text-sm"><strong>End:</strong> {formatDateTime(session.endTime)}</p>
              <p className="text-sm"><strong>Capacity:</strong> {session.enrolled ?? 0} / {session.capacity || 'Unlimited'}</p>

              {isEnrolled(session.id) ? (
                <button
                  onClick={() => handleUnenroll(getEnrollmentId(session.id)!)}
                  disabled={enrollmentLoading}
                  className="mt-3 px-3 py-1 bg-red-500 text-white text-sm rounded hover:bg-red-600 transition disabled:opacity-50"
                >
                  Unenroll
                </button>
              ) : (
                <button
                  onClick={() => handleEnroll(session.id)}
                  disabled={enrollmentLoading}
                  className="mt-3 px-3 py-1 bg-blue-500 text-white text-sm rounded hover:bg-blue-600 transition disabled:opacity-50"
                >
                  Enroll
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
