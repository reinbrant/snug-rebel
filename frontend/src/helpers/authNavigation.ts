import { ROUTES } from '../routes'

export function safeReturnTo(value: string | null): string {
  if (!value?.startsWith('/') || value.startsWith('//')) return ROUTES.account
  try {
    const url = new URL(value, window.location.origin)
    const authPaths: string[] = [ROUTES.signIn, ROUTES.signUp, ROUTES.verifyEmail]
    return url.origin === window.location.origin && !authPaths.includes(url.pathname)
      ? `${url.pathname}${url.search}${url.hash}` : ROUTES.account
  } catch {
    return ROUTES.account
  }
}
