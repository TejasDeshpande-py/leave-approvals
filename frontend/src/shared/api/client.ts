const API_BASE = import.meta.env.VITE_API_BASE_URL ?? '/api/v1'
const inFlightGetRequests = new Map<string, Promise<unknown>>()
let accessToken: string | null = null
let refreshInFlight: Promise<string> | null = null

export function getAccessToken() {
  return accessToken
}

export function setAccessToken(token: string | null) {
  accessToken = token
}

export function clearLegacyTokens() {
  localStorage.removeItem('leave-office-access-token')
  localStorage.removeItem('leave-office-refresh-token')
}

function errorMessage(payload: unknown, status: number) {
  if (payload && typeof payload === 'object' && 'detail' in payload) {
    const detail = payload.detail
    if (typeof detail === 'string') return detail
    if (Array.isArray(detail)) return detail.map((item) => item?.msg ?? 'Invalid request').join('. ')
  }
  return `Request failed (${status})`
}

export function apiRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = getAccessToken()
  const method = (init.method ?? 'GET').toUpperCase()
  const key = method === 'GET' ? `${token ?? 'anonymous'}:${path}` : null
  if (key) {
    const existing = inFlightGetRequests.get(key)
    if (existing) return existing as Promise<T>
  }

  const request = performRequest<T>(path, init, token)
  if (!key) return request

  inFlightGetRequests.set(key, request)
  const removeRequest = () => {
    if (inFlightGetRequests.get(key) === request) inFlightGetRequests.delete(key)
  }
  void request.then(removeRequest, removeRequest)
  return request
}

async function sendRequest(path: string, init: RequestInit, token: string | null) {
  const headers = new Headers(init.headers)
  if (init.body && !(init.body instanceof FormData)) headers.set('Content-Type', 'application/json')
  if (token) headers.set('Authorization', `Bearer ${token}`)

  let response: Response
  try {
    response = await fetch(`${API_BASE}${path}`, { ...init, headers, credentials: 'include' })
  } catch {
    throw new Error('Cannot reach the backend. Start the API at http://127.0.0.1:8001.')
  }
  const payload: unknown = await response.json().catch(() => null)
  return { response, payload }
}

async function refreshAccessToken(): Promise<string> {
  if (refreshInFlight) return refreshInFlight

  refreshInFlight = (async () => {
    const { response, payload } = await sendRequest('/auth/refresh', { method: 'POST' }, null)
    if (!response.ok) {
      if (response.status === 401) {
        setAccessToken(null)
        window.dispatchEvent(new Event('leave-office-auth-expired'))
      }
      throw new Error(errorMessage(payload, response.status))
    }
    if (
      !payload || typeof payload !== 'object' ||
      !('access_token' in payload) || typeof payload.access_token !== 'string'
    ) {
      throw new Error('The backend returned an invalid token response.')
    }

    setAccessToken(payload.access_token)
    return payload.access_token
  })()
  void refreshInFlight.then(
    () => { refreshInFlight = null },
    () => { refreshInFlight = null },
  )
  return refreshInFlight
}

async function performRequest<T>(path: string, init: RequestInit, token: string | null): Promise<T> {
  let { response, payload } = await sendRequest(path, init, token)
  const canRefresh = !path.startsWith('/auth/') && response.status === 401
  if (canRefresh) {
    const refreshedToken = await refreshAccessToken()
    ;({ response, payload } = await sendRequest(path, init, refreshedToken))
    if (response.status === 401) {
      setAccessToken(null)
      window.dispatchEvent(new Event('leave-office-auth-expired'))
    }
  }
  if (!response.ok) throw new Error(errorMessage(payload, response.status))
  return payload as T
}

export function postJson<T>(path: string, body: unknown) {
  return apiRequest<T>(path, { method: 'POST', body: JSON.stringify(body) })
}

export function patchJson<T>(path: string, body: unknown) {
  return apiRequest<T>(path, { method: 'PATCH', body: JSON.stringify(body) })
}