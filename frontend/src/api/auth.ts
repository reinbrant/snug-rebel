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
    emailVerified: boolean
}

export type Registration = {
    firstName: string; lastName: string; email: string; password: string; phoneNumber: string
}

export type RegistrationResult = { verificationRequired: true; email: string; message: string }

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

export const signUp = ({ firstName, lastName, email, password, phoneNumber }: Registration) => apiFetch<RegistrationResult>('/Auth/register', {
    method: 'POST', body: JSON.stringify({ firstName, lastName, email: email.trim(), password, phoneNumber, sessionToken: getSessionToken() }),
})

export const signOut = () => apiFetch<void>('/Auth/logout', { method: 'POST' })

export const resendVerification = (email: string) => apiFetch<{ message: string }>('/Auth/resend-verification', {
    method: 'POST', body: JSON.stringify({ email: email.trim() }),
})

export const verifyEmail = (token: string) => apiFetch<{ message: string }>('/Auth/verify-email', {
    method: 'POST', body: JSON.stringify({ token }),
})

export const verifyEmailCode = (email: string, code: string) => apiFetch<{ message: string }>('/Auth/verify-email-code', {
    method: 'POST', body: JSON.stringify({ email: email.trim(), code }),
})

export const requestLoginCode = (email: string) => apiFetch<{ message: string }>('/Auth/request-login-code', {
    method: 'POST', body: JSON.stringify({ email: email.trim() }),
})

export const signInWithCode = (email: string, code: string) => apiFetch<AuthUser>('/Auth/login-code', {
    method: 'POST', body: JSON.stringify({ email: email.trim(), code, sessionToken: getSessionToken() }),
})

export const authErrorMessage = (error: unknown) => error instanceof ApiError
    ? error.serverMessage || 'Unable to complete the request. Please try again.'
    : error instanceof Error ? error.message : 'Unable to complete the request.'
