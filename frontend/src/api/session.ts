const SESSION_STORAGE_KEY = 'snugrebel.sessionToken'

export function getSessionToken(): string {
    try {
        const existing = localStorage.getItem(SESSION_STORAGE_KEY)
        if (existing) return existing

        const token = `sess_${
            typeof crypto.randomUUID === 'function'
                ? crypto.randomUUID()
                : Math.random().toString(36).slice(2) + Date.now().toString(36)
        }`
        localStorage.setItem(SESSION_STORAGE_KEY, token)
        return token
    } catch {
        // Generate an in-memory UUID instead of a static string for private browsing users
        return `sess_${
            typeof crypto.randomUUID === 'function'
                ? crypto.randomUUID()
                : Math.random().toString(36).slice(2) + Date.now().toString(36)
        }`
    }
}