import { createContext } from 'react'
import type { Role, SessionUser, Sex, SystemInfo } from '../data/types'

export type RegisterResult = { status: 'active'; user: SessionUser } | { status: 'pending' }

export interface AuthValue {
  status: 'loading' | 'signed-in' | 'signed-out'
  user: SessionUser | null
  /** Public server information: demo mode, demo accounts, clinical clock. */
  info: SystemInfo | null
  login: (email: string, password: string, remember: boolean) => Promise<SessionUser>
  logout: () => Promise<void>
  register: (input: {
    name: string
    email: string
    password: string
    role: Role
    organisation?: string
    dateOfBirth?: string
    sex?: Sex
  }) => Promise<RegisterResult>
  setPassword: (token: string, password: string) => Promise<void>
}

export const AuthContext = createContext<AuthValue | null>(null)
