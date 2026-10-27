import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { Role, SessionUser, Sex, SystemInfo } from '../data/types'
import { syncClock } from '../lib/clock'
import { api, onSessionChange, refreshSession, setSession, type SessionPayload } from '../lib/http'
import { AuthContext, type AuthValue, type RegisterResult } from './authContext'

function hasSessionHint(): boolean {
  try {
    return document.cookie.split('; ').some((cookie) => cookie.startsWith('medora_session='))
  } catch {
    return true
  }
}

// Bootstrap runs once per page load, even under StrictMode's double effects.
let bootstrap: Promise<{ info: SystemInfo | null; session: SessionPayload | null }> | null = null

function loadOnce() {
  bootstrap ??= (async () => {
    const info = await api.get<SystemInfo>('/system/info').catch(() => null)
    if (info) syncClock(info.clock.now)
    // The API sets a readable hint cookie alongside the httpOnly refresh cookie.
    const session = hasSessionHint() ? await refreshSession() : null
    return { info, session }
  })()
  return bootstrap
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthValue['status']>('loading')
  const [user, setUser] = useState<SessionUser | null>(null)
  const [info, setInfo] = useState<SystemInfo | null>(null)

  useEffect(() => {
    const stop = onSessionChange((next) => {
      setUser(next)
      setStatus(next ? 'signed-in' : 'signed-out')
    })
    void loadOnce().then((result) => {
      setInfo(result.info)
      setUser(result.session?.user ?? null)
      setStatus(result.session ? 'signed-in' : 'signed-out')
    })
    return stop
  }, [])

  const login = useCallback(async (email: string, password: string, remember: boolean) => {
    const payload = await api.post<SessionPayload>('/auth/login', { email, password, remember })
    setSession(payload)
    return payload.user
  }, [])

  const logout = useCallback(async () => {
    await api.post('/auth/logout').catch(() => undefined)
    setSession(null)
  }, [])

  const register = useCallback(
    async (input: {
      name: string
      email: string
      password: string
      role: Role
      organisation?: string
      dateOfBirth?: string
      sex?: Sex
    }): Promise<RegisterResult> => {
      const result = await api.post<{ status: 'pending' } | ({ status: 'active' } & SessionPayload)>(
        '/auth/register',
        input,
      )
      if (result.status === 'active') {
        setSession(result)
        return { status: 'active', user: result.user }
      }
      return { status: 'pending' }
    },
    [],
  )

  const setPassword = useCallback(async (token: string, password: string) => {
    await api.post('/auth/set-password', { token, password })
  }, [])

  const value = useMemo<AuthValue>(
    () => ({ status, user, info, login, logout, register, setPassword }),
    [status, user, info, login, logout, register, setPassword],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
