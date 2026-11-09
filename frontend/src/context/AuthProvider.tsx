import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import * as auth from '../api/auth'
import { rotateSessionToken } from '../api/session'
import { AuthContext, type AuthState } from './authContext'

const CHANGE_KEY = 'snugrebel.auth-change'
const announceChange = () => {
    try { localStorage.setItem(CHANGE_KEY, crypto.randomUUID()) } catch { /* Cookie remains the source of truth. */ }
}

export function AuthProvider({ children }: { children: ReactNode }) {
    const [state, setState] = useState<AuthState>({ status: 'loading', user: null, error: null })
    const version = useRef(0)

    const refresh = useCallback(async () => {
        const requestVersion = ++version.current
        try {
            const user = await auth.getSession()
            if (requestVersion !== version.current) return
            setState(user ? { status: 'authenticated', user, error: null } : { status: 'anonymous', user: null, error: null })
        } catch (error) {
            if (requestVersion === version.current) setState({ status: 'error', user: null, error: auth.authErrorMessage(error) })
        }
    }, [])

    useEffect(() => {
        // Session state changes only after the HTTP request resolves.
        // eslint-disable-next-line react-hooks/set-state-in-effect
        void refresh()
        const requests = version
        const onStorage = (event: StorageEvent) => { if (event.key === CHANGE_KEY) void refresh() }
        const onFocus = () => { void refresh() }
        window.addEventListener('storage', onStorage)
        window.addEventListener('focus', onFocus)
        window.addEventListener('snug-auth-expired', onFocus)
        return () => {
            requests.current++
            window.removeEventListener('storage', onStorage)
            window.removeEventListener('focus', onFocus)
            window.removeEventListener('snug-auth-expired', onFocus)
        }
    }, [refresh])

    async function authenticate(action: () => Promise<auth.AuthUser>) {
        version.current++
        const user = await action()
        version.current++
        rotateSessionToken()
        setState({ status: 'authenticated', user, error: null })
        announceChange()
    }

    return <AuthContext.Provider value={{ ...state, refresh,
        signIn: (email, password) => authenticate(() => auth.signIn(email, password)),
        signInWithCode: (email, code) => authenticate(() => auth.signInWithCode(email, code)),
        signUp: form => auth.signUp(form),
        signOut: async () => {
            version.current++
            await auth.signOut()
            version.current++
            rotateSessionToken()
            setState({ status: 'anonymous', user: null, error: null })
            announceChange()
        },
    }}>{children}</AuthContext.Provider>
}
