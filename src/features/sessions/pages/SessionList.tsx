import { useNavigate } from 'react-router-dom'
import { useSessions } from '../hooks/useSessions'

export const SessionList = () => {
  const { sessions, loading, error } = useSessions()
  const navigate = useNavigate()

  if (loading) return <div className="p-8 text-center">Loading sessions...</div>
  if (error) return <div className="p-8 text-center text-red-500">Error: {error}</div>

  const formatDateTime = (dateTime: string) => {
    const date = new Date(dateTime)
    return date.toLocaleString()
  }

  const getSessionStatus = (startTime: string, endTime: string): 'upcoming' | 'ongoing' | 'completed' => {
    const now = new Date()
    const start = new Date(startTime)
    const end = new Date(endTime)

    if (now < start) return 'upcoming'
    if (now >= start && now <= end) return 'ongoing'
    return 'completed'
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'upcoming':
        return 'bg-blue-100 text-blue-700 border-blue-200'
      case 'ongoing':
        return 'bg-emerald-100 text-emerald-700 border-emerald-200'
      case 'completed':
        return 'bg-gray-100 text-gray-600 border-gray-200'
      default:
        return 'bg-gray-100 text-gray-600'
    }
  }

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold text-center mb-6 text-gray-800">Sessions</h1>

      <button
        onClick={() => navigate('/sessions/new')}
        className="mb-6 px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 transition"
      >
        Create Session
      </button>

      {sessions.length === 0 ? (
        <p className="text-center text-gray-600">No sessions yet</p>
      ) : (
        <table className="w-full border-collapse border border-gray-300">
          <thead>
            <tr className="bg-gray-100">
              <th className="border border-gray-300 p-3 text-left font-semibold">Title</th>
              <th className="border border-gray-300 p-3 text-left font-semibold">Category</th>
              <th className="border border-gray-300 p-3 text-left font-semibold">Type</th>
              <th className="border border-gray-300 p-3 text-left font-semibold">Trainer</th>
              <th className="border border-gray-300 p-3 text-left font-semibold">Start Time</th>
              <th className="border border-gray-300 p-3 text-left font-semibold">Branch</th>
              <th className="border border-gray-300 p-3 text-left font-semibold">Capacity</th>
              <th className="border border-gray-300 p-3 text-left font-semibold">Status</th>
            </tr>
          </thead>
          <tbody>
            {sessions.map(session => (
              <tr key={session.id} onClick={() => navigate(`/sessions/${session.id}`)} className="hover:bg-gray-50 cursor-pointer">
                <td className="border border-gray-300 p-3">{session.title}</td>
                <td className="border border-gray-300 p-3 capitalize">{session.category?.replace(/_/g, ' ') ?? '-'}</td>
                <td className="border border-gray-300 p-3 capitalize">{session.type}</td>
                <td className="border border-gray-300 p-3">{session.trainerName || '-'}</td>
                <td className="border border-gray-300 p-3">{formatDateTime(session.startTime)}</td>
                <td className="border border-gray-300 p-3">{session.branchName && session.branchCity ? `${session.branchName} (${session.branchCity})` : '-'}</td>
                <td className="border border-gray-300 p-3">
                  {session.enrolled ?? 0} {session.capacity ? `/ ${session.capacity}` : ''}
                </td>
                <td className="border border-gray-300 p-3">
                  <span className={`px-2 py-1 rounded-full text-xs font-semibold border ${getStatusColor(getSessionStatus(session.startTime, session.endTime))}`}>
                    {getSessionStatus(session.startTime, session.endTime)}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}
