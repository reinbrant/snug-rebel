const SESSION_STORAGE_KEY = 'snugrebel.sessionToken'
let memoryToken: string | null = null

const newToken = () => `sess_${crypto.randomUUID()}`

export function getSessionToken(): string {
    try {
        const existing = localStorage.getItem(SESSION_STORAGE_KEY)
        if (existing) return existing
        const token = memoryToken ?? newToken()
        memoryToken = token
        localStorage.setItem(SESSION_STORAGE_KEY, token)
        return token
    } catch {
        return memoryToken ??= newToken()
    }
}

export function rotateSessionToken(): void {
    memoryToken = newToken()
    try { localStorage.setItem(SESSION_STORAGE_KEY, memoryToken) } catch { /* In-memory guest bag. */ }
}
