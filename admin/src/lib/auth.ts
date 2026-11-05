import type { AuthUser } from '../types'

import { API_BASE, apiFetch } from './config'

async function readErrorMessage(response: Response) {
  try {
    const payload = await response.json()
    return payload?.message ?? payload?.error ?? 'Request failed.'
  } catch {
    return response.statusText || 'Request failed.'
  }
}

export async function loginWithEmailPassword(email: string, password: string) {
  const response = await apiFetch(`${API_BASE}/api/Auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email, password }),
  })

  if (!response.ok) {
    throw new Error(await readErrorMessage(response))
  }

  const payload = (await response.json()) as AuthUser

  return payload
}

export async function loginWithOAuth(provider: 'google' | 'github' = 'google') {
  return Promise.reject(
    new Error(
      `OAuth provider "${provider}" is not configured yet. Use email authentication until the provider is added.`,
    ),
  )
}
