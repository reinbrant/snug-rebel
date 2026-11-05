import { createContext, useContext } from 'react'
import type { AuthUser, Registration } from '../api/auth'

export type AuthState =
    | { status: 'loading' | 'anonymous' | 'error'; user: null; error: string | null }
    | { status: 'authenticated'; user: AuthUser; error: null }

export type AuthContextValue = AuthState & {
    signIn: (email: string, password: string) => Promise<void>
    signUp: (form: Registration) => Promise<void>
    signOut: () => Promise<void>
    refresh: () => Promise<void>
}

export const AuthContext = createContext<AuthContextValue | null>(null)

export function useAuth() {
    const value = useContext(AuthContext)
    if (!value) throw new Error('useAuth must be used within AuthProvider')
    return value
}
