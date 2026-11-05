const API_URL = ((import.meta.env.VITE_API_URL as string | undefined) ?? 'http://localhost:5146/api').replace(/\/$/, '')

// Thrown for any failed request
export class ApiError extends Error {
    // HTTP status. 0 means the server couldn't be reached at all
    status: number
    // The backend's error code, e.g. "CartNotFound"
    code?: string
    // The backend's readable message, if it sent one. Safe to show to the user
    serverMessage?: string

    constructor({ status, code, serverMessage }: { status: number; code?: string; serverMessage?: string }) {
        super(`API error: ${status}`)
        this.name = 'ApiError'
        this.status = status
        this.code = code
        this.serverMessage = serverMessage
    }
}

export async function apiFetch<T>(endpoint: string, init: RequestInit = {}): Promise<T> {
    const headers = new Headers(init.headers)
    if (!headers.has('Content-Type')) headers.set('Content-Type', 'application/json')

    let res: Response
    try {
        res = await fetch(`${API_URL}${endpoint}`, { ...init, headers })
    } catch {
        throw new ApiError({
            status: 0,
            serverMessage: 'Could not reach the server. Check your connection and try again.',
        })
    }

    if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { error?: string; message?: string } | null
        throw new ApiError({ status: res.status, code: body?.error, serverMessage: body?.message })
    }

    const text = await res.text()
    return (text ? JSON.parse(text) : undefined) as T
}
export function resolveAssetUrl(url: string | null | undefined): string {
    if (!url) return ''
    if (/^(https?:)?\/\//i.test(url) || url.startsWith('data:')) return url
    return `${API_URL.replace(/\/api$/, '')}${url.startsWith('/') ? '' : '/'}${url}`
}
