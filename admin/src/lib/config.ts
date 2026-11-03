// Single source of truth for the backend base URL.
// Set VITE_API_BASE_URL in .env to override (e.g. for staging/production).
export const API_BASE: string = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:5146'

// Turn a URL returned by the API into something the browser can load.
// Relative paths (e.g. "/uploads/models/tee.glb") are resolved against API_BASE.
export function resolveAssetUrl(url: string | undefined | null): string {
  if (!url) return ''
  if (/^(https?:)?\/\//i.test(url) || url.startsWith('data:') || url.startsWith('blob:')) return url
  return `${API_BASE}${url.startsWith('/') ? '' : '/'}${url}`
}

// Read an error message from a failed response without assuming it is JSON.
export async function readErrorMessage(response: Response, fallback: string): Promise<string> {
  try {
    const text = await response.text()
    if (!text) return fallback
    try {
      const data = JSON.parse(text)
      return data?.message ?? data?.title ?? data?.error ?? fallback
    } catch {
      return text.length < 200 ? text : fallback
    }
  } catch {
    return fallback
  }
}