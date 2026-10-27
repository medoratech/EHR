import type { SessionUser } from '../data/types'

// Thin client for the Medora API. The short-lived access token lives only in memory;
// the refresh token is an httpOnly cookie the browser sends to /api/auth.

const API_BASE = `${import.meta.env.VITE_API_URL ?? ''}/api`

export class ApiError extends Error {
  readonly status: number
  readonly code: string

  constructor(status: number, code: string, message: string) {
    super(message)
    this.status = status
    this.code = code
  }
}

export interface SessionPayload {
  accessToken: string
  user: SessionUser
}

let accessToken: string | null = null
let refreshing: Promise<SessionPayload | null> | null = null
const listeners = new Set<(user: SessionUser | null) => void>()

/** Called whenever the session starts, refreshes into a new user, or ends. */
export function onSessionChange(listener: (user: SessionUser | null) => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function setSession(payload: SessionPayload | null) {
  accessToken = payload?.accessToken ?? null
  for (const listener of listeners) listener(payload?.user ?? null)
}

export function currentAccessToken(): string | null {
  return accessToken
}

/** Exchanges the refresh cookie for a new access token. Concurrent callers share one request. */
export function refreshSession(): Promise<SessionPayload | null> {
  refreshing ??= fetch(`${API_BASE}/auth/refresh`, { method: 'POST', credentials: 'include' })
    .then(async (res) => (res.ok ? ((await res.json()) as SessionPayload) : null))
    .catch(() => null)
    .then((payload) => {
      setSession(payload)
      return payload
    })
    .finally(() => {
      refreshing = null
    })
  return refreshing
}

async function toError(res: Response): Promise<ApiError> {
  try {
    const body = (await res.json()) as { error?: { code?: string; message?: string } }
    return new ApiError(res.status, body.error?.code ?? 'error', body.error?.message ?? res.statusText)
  } catch {
    return new ApiError(res.status, 'error', 'The Medora service is not responding. Please try again.')
  }
}

async function request<T>(method: string, path: string, body?: unknown, retry = true): Promise<T> {
  let res: Response
  try {
    res = await fetch(`${API_BASE}${path}`, {
      method,
      credentials: 'include',
      headers: {
        ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    })
  } catch {
    throw new ApiError(0, 'offline', 'Cannot reach the Medora service. Check your connection.')
  }

  if (res.status === 401 && retry && !path.startsWith('/auth/')) {
    if (await refreshSession()) return request<T>(method, path, body, false)
  }
  if (!res.ok) throw await toError(res)
  if (res.status === 204) return undefined as T
  return (await res.json()) as T
}

export const api = {
  get: <T>(path: string) => request<T>('GET', path),
  post: <T>(path: string, body: unknown = {}) => request<T>('POST', path, body),
  patch: <T>(path: string, body: unknown) => request<T>('PATCH', path, body),
  put: <T>(path: string, body: unknown) => request<T>('PUT', path, body),
}

/**
 * Opens the server-sent change feed with the bearer token in a header (EventSource
 * cannot send one). Resolves when the stream ends; rejects with ApiError on HTTP errors.
 */
export async function streamEvents(
  onEvent: (event: string, data: unknown) => void,
  signal: AbortSignal,
): Promise<void> {
  const res = await fetch(`${API_BASE}/events`, {
    headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
    credentials: 'include',
    signal,
  })
  if (!res.ok || !res.body) throw await toError(res)

  const reader = res.body.pipeThrough(new TextDecoderStream()).getReader()
  let buffer = ''
  for (;;) {
    const { value, done } = await reader.read()
    if (done) return
    buffer += value
    let boundary: number
    while ((boundary = buffer.indexOf('\n\n')) !== -1) {
      const frame = buffer.slice(0, boundary)
      buffer = buffer.slice(boundary + 2)
      let event = 'message'
      let data = ''
      for (const line of frame.split('\n')) {
        if (line.startsWith('event:')) event = line.slice(6).trim()
        else if (line.startsWith('data:')) data += line.slice(5).trim()
      }
      if (data) onEvent(event, JSON.parse(data))
    }
  }
}
