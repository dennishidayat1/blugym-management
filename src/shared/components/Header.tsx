import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export const Header = () => {
  const location = useLocation()
  const navigate = useNavigate()
  const { authState, signOut, isAdmin, isMember } = useAuth()

  const isActive = (path: string) =>
    location.pathname === path
      ? 'border-b-2 border-blue-600 text-blue-600'
      : 'text-gray-600 hover:text-gray-900'

  const handleSignOut = async () => {
    await signOut()
    navigate('/login', { replace: true })
  }

  const userName = authState.status === 'authenticated'
    ? authState.data.user.email?.split('@')[0]
    : null

  return (
    <header className="bg-white shadow-sm sticky top-0 z-50">
      <div className="container mx-auto px-4">
        <nav className="flex items-center justify-between h-16">

          {/* Logo */}
          <Link
            to={isAdmin ? '/dashboard' : '/member/dashboard'}
            className="text-xl font-bold text-gray-900 hover:text-blue-600 transition"
          >
            Blu Gym Manager
          </Link>

          {/* Admin nav */}
          {isAdmin && (
            <div className="flex items-center space-x-1">
              <Link to="/dashboard" className={`px-3 py-2 text-sm font-medium transition ${isActive('/dashboard')}`}>
                Dashboard
              </Link>
              <Link to="/members" className={`px-3 py-2 text-sm font-medium transition ${isActive('/members')}`}>
                Members
              </Link>
              <Link to="/trainers" className={`px-3 py-2 text-sm font-medium transition ${isActive('/trainers')}`}>
                Trainers
              </Link>
              <Link to="/sessions" className={`px-3 py-2 text-sm font-medium transition ${isActive('/sessions')}`}>
                Sessions
              </Link>
              <Link to="/admin/trainer-schedules" className={`px-3 py-2 text-sm font-medium transition ${isActive('/admin/trainer-schedules')}`}>
                Schedules
              </Link>
            </div>
          )}

          {/* Member nav */}
          {isMember && (
            <div className="flex items-center space-x-1">
              <Link to="/member/dashboard" className={`px-3 py-2 text-sm font-medium transition ${isActive('/member/dashboard')}`}>
                Dashboard
              </Link>
              <Link to="/book-pt-session" className={`px-3 py-2 text-sm font-medium transition ${isActive('/book-pt-session')}`}>
                Book PT
              </Link>
            </div>
          )}

          {/* User info + sign out */}
          <div className="flex items-center gap-3">
            {userName && (
              <span className="text-sm text-gray-500">
                {userName}
                {isAdmin && (
                  <span className="ml-1.5 rounded-full bg-blue-100 px-2 py-0.5 text-xs font-semibold text-blue-700">
                    Admin
                  </span>
                )}
                {isMember && (
                  <span className="ml-1.5 rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-700">
                    Member
                  </span>
                )}
              </span>
            )}
            {authState.status === 'authenticated' && (
              <button
                onClick={handleSignOut}
                className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-600 hover:bg-gray-50 transition"
              >
                Sign out
              </button>
            )}
          </div>

        </nav>
      </div>
    </header>
  )
}
