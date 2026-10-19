import type { ReactNode } from 'react'
import { Navigate, Outlet, Route, Routes } from 'react-router-dom'
import { useAuth } from './auth/useAuth'
import { homePath } from './homePath'
import { AuthLayout } from '../layouts/AuthLayout'
import { WorkspaceLayout } from '../layouts/WorkspaceLayout'
import { LoginPage } from '../pages/LoginPage'
import { RegisterPage } from '../pages/RegisterPage'
import { LeaveComposePage } from '../pages/LeaveComposePage'
import { MyRequestsPage } from '../pages/MyRequestsPage'
import { ReviewPage } from '../pages/ReviewPage'
import { UserApprovalPage } from '../pages/UserApprovalPage'
import { ProfilePage } from '../pages/ProfilePage'
import type { Role } from '../shared/types'

function Authenticated() {
  const { user, loading } = useAuth()
  if (loading) return <div className="loading-state">Loading your workspace...</div>
  return user ? <Outlet /> : <Navigate to="/login" replace />
}

function Roles({ allowed, children }: { allowed: Role[]; children: ReactNode }) {
  const { user } = useAuth()
  if (!user) return <Navigate to="/login" replace />
  return allowed.includes(user.role) ? children : <Navigate to="/request" replace />
}

function HomeRedirect() {
  const { user } = useAuth()
  return <Navigate to={user ? homePath(user.role) : '/login'} replace />
}

function PublicOnly({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth()
  if (loading) return <div className="loading-state">Loading...</div>
  return user ? <HomeRedirect /> : children
}

const allRoles: Role[] = ['employee', 'hr', 'admin']
const reviewers: Role[] = ['hr', 'admin']

export function AppRoutes() {
  return <Routes>
    <Route element={<AuthLayout />}>
      <Route path="/login" element={<PublicOnly><LoginPage /></PublicOnly>} />
      <Route path="/register" element={<PublicOnly><RegisterPage /></PublicOnly>} />
    </Route>
    <Route element={<Authenticated />}><Route element={<WorkspaceLayout />}>
      <Route index element={<HomeRedirect />} />
      <Route path="request" element={<Roles allowed={allRoles}><LeaveComposePage /></Roles>} />
      <Route path="mine" element={<Roles allowed={allRoles}><MyRequestsPage /></Roles>} />
      <Route path="review" element={<Roles allowed={reviewers}><ReviewPage /></Roles>} />
      <Route path="users" element={<Roles allowed={['admin']}><UserApprovalPage /></Roles>} />
      <Route path="profile" element={<Roles allowed={allRoles}><ProfilePage /></Roles>} />
    </Route></Route>
    <Route path="*" element={<Navigate to="/" replace />} />
  </Routes>
}