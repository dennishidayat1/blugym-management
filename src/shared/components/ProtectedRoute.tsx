import { Navigate } from 'react-router-dom'
import type { ReactNode } from 'react'
import { useAuth } from '../context/AuthContext'
import type { UserRole } from '../context/AuthContext'

interface ProtectedRouteProps {
  children: ReactNode
  allowedRoles: UserRole[]
}

export const ProtectedRoute = ({ children, allowedRoles }: ProtectedRouteProps) => {
  const { authState } = useAuth()

  // Still loading session
  if (authState.status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-sm text-slate-400">Loading…</div>
      </div>
    )
  }

  // Not logged in
  if (authState.status === 'unauthenticated') {
    return <Navigate to="/login" replace />
  }

  // Logged in but wrong role
  if (!allowedRoles.includes(authState.data.role)) {
    const role = authState.data.role
    if (role === 'admin') return <Navigate to="/admin" replace />
    if (role === 'member') return <Navigate to="/member" replace />
    if (role === 'trainer') return <Navigate to="/trainer" replace />
    return <Navigate to="/login" replace />
  }

  return <>{children}</>
}
