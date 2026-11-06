import { ApiError, apiFetch } from './api'
import { getSessionToken } from './session'

export type AuthUser = {
    pkUserId: string
    userEmail: string
    firstName: string
    lastName: string
    phoneNumber: string
    role: 'Customer' | 'Admin' | 'Staff'
    isActive: boolean
}

export type Registration = {
    firstName: string; lastName: string; email: string; password: string; phoneNumber: string
}

export async function getSession(): Promise<AuthUser | null> {
    try { return await apiFetch<AuthUser>('/Auth/session') }
    catch (error) {
        if (error instanceof ApiError && error.status === 401) return null
        throw error
    }
}

export const signIn = (email: string, password: string) => apiFetch<AuthUser>('/Auth/login', {
    method: 'POST', body: JSON.stringify({ email: email.trim(), password, sessionToken: getSessionToken() }),
})

export const signUp = ({ firstName, lastName, email, password, phoneNumber }: Registration) => apiFetch<AuthUser>('/Auth/register', {
    method: 'POST', body: JSON.stringify({ firstName, lastName, email: email.trim(), password, phoneNumber, sessionToken: getSessionToken() }),
})

export const signOut = () => apiFetch<void>('/Auth/logout', { method: 'POST' })

export const authErrorMessage = (error: unknown) => error instanceof ApiError
    ? error.serverMessage || 'Unable to complete the request. Please try again.'
    : error instanceof Error ? error.message : 'Unable to complete the request.'
