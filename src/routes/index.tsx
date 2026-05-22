import { Routes, Route, Navigate } from 'react-router-dom'
import { ProtectedRoute } from '../shared/components/ProtectedRoute'

// Auth
import { LoginPage } from '../features/auth/pages/LoginPage'

// Admin pages
import { Dashboard } from '../features/dashboard'
import { Members, NewMember, EditMember, MemberDetail } from '../features/members'
import { TrainerList } from '../features/trainers/pages/TrainerList'
import { TrainerForm } from '../features/trainers/pages/TrainerForm'
import { TrainerDetail } from '../features/trainers/pages/TrainerDetail'
import { SessionList } from '../features/sessions/pages/SessionList'
import { SessionForm } from '../features/sessions/pages/SessionForm'
import { SessionEnrollmentPage } from '../features/sessions/pages/SessionEnrollmentPage'
import { TrainerScheduleManager } from '../features/sessions/pages/TrainerScheduleManager'

// Member pages
import { BookPTSession } from '../features/sessions/pages/BookPTSession'
import { MemberDashboard } from '../features/members/pages/MemberDashboard'

function AppRoutes() {
  return (
    <Routes>
      {/* Public */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/" element={<Navigate to="/login" replace />} />

      {/* Admin only */}
      <Route path="/dashboard" element={
        <ProtectedRoute allowedRoles={['admin']}>
          <Dashboard />
        </ProtectedRoute>
      } />
      <Route path="/members" element={
        <ProtectedRoute allowedRoles={['admin']}>
          <Members />
        </ProtectedRoute>
      } />
      <Route path="/members/new" element={
        <ProtectedRoute allowedRoles={['admin']}>
          <NewMember />
        </ProtectedRoute>
      } />
      <Route path="/members/:id" element={
        <ProtectedRoute allowedRoles={['admin']}>
          <MemberDetail />
        </ProtectedRoute>
      } />
      <Route path="/members/:id/edit" element={
        <ProtectedRoute allowedRoles={['admin']}>
          <EditMember />
        </ProtectedRoute>
      } />
      <Route path="/trainers" element={
        <ProtectedRoute allowedRoles={['admin']}>
          <TrainerList />
        </ProtectedRoute>
      } />
      <Route path="/trainers/new" element={
        <ProtectedRoute allowedRoles={['admin']}>
          <TrainerForm />
        </ProtectedRoute>
      } />
      <Route path="/trainers/:id" element={
        <ProtectedRoute allowedRoles={['admin']}>
          <TrainerDetail />
        </ProtectedRoute>
      } />
      <Route path="/sessions" element={
        <ProtectedRoute allowedRoles={['admin']}>
          <SessionList />
        </ProtectedRoute>
      } />
      <Route path="/sessions/new" element={
        <ProtectedRoute allowedRoles={['admin']}>
          <SessionForm />
        </ProtectedRoute>
      } />
      <Route path="/sessions/:id" element={
        <ProtectedRoute allowedRoles={['admin']}>
          <SessionForm />
        </ProtectedRoute>
      } />
      <Route path="/sessions/enroll" element={
        <ProtectedRoute allowedRoles={['admin']}>
          <SessionEnrollmentPage />
        </ProtectedRoute>
      } />
      <Route path="/admin/trainer-schedules" element={
        <ProtectedRoute allowedRoles={['admin']}>
          <TrainerScheduleManager />
        </ProtectedRoute>
      } />

      {/* Member only */}
      <Route path="/member/dashboard" element={
        <ProtectedRoute allowedRoles={['member']}>
          <MemberDashboard />
        </ProtectedRoute>
      } />
      <Route path="/book-pt-session" element={
        <ProtectedRoute allowedRoles={['member']}>
          <BookPTSession />
        </ProtectedRoute>
      } />

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  )
}

export default AppRoutes
