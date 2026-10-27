import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router'
import { useAuth } from '../../state/useAuth'
import { canOpenPortal } from './access'

function FullPageMessage({ children }: { children: ReactNode }) {
  return (
    <div className="app-canvas flex min-h-screen items-center justify-center px-4" role="status" aria-live="polite">
      <p className="rounded-2xl border border-cyan-100 bg-white px-5 py-4 text-sm font-semibold text-cyan-800 shadow-sm">
        {children}
      </p>
    </div>
  )
}

/** Gate for the workspace routes: signed in, and allowed into this portal. */
export function RequireAuth({ children }: { children: ReactNode }) {
  const { status, user } = useAuth()
  const location = useLocation()

  if (status === 'loading') return <FullPageMessage>Opening your workspace…</FullPageMessage>
  if (!user) return <Navigate to="/login" replace state={{ from: `${location.pathname}${location.search}` }} />

  const portalId = location.pathname.split('/')[1] ?? ''
  if (!canOpenPortal(user.role, portalId)) return <Navigate to={user.home} replace />
  return children
}
