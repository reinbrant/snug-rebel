export const ROUTES = {
  home: '/',
  shop: '/shop',
  about: '/about',
  tracking: '/tracking',
  checkout: '/checkout',
  signIn: '/sign-in',
  signUp: '/sign-up',
  verifyEmail: '/verify-email',
  account: '/account'
} as const

export type Page = keyof typeof ROUTES

/** Main nav links, in display order. Add a page here (and in ROUTES) and it shows up in the bar. */
export const NAV_LINKS: { page: Page; label: string }[] = [
  { page: 'home', label: 'Home' },
  { page: 'shop', label: 'Shop' },
  { page: 'about', label: 'About' },
  { page: 'tracking', label: 'Tracking' }
]

/** Router path pattern for the item page (relative to the root layout). */
export const ITEM_ROUTE_PATTERN = 'shop/:itemId'

/** Link to one item's page, e.g. itemPath('p2') -> "/shop/p2". */
export const itemPath = (itemId: string) => `${ROUTES.shop}/${encodeURIComponent(itemId)}`

/** Which nav page a URL belongs to (so /shop/tops still highlights Shop). null = none. */
export function pageFromPath(pathname: string): Page | null {
  const pages = Object.keys(ROUTES) as Page[]
  const match = pages.find((page) => {
    const path = ROUTES[page]
    if (path === '/') return pathname === '/'
    return pathname === path || pathname.startsWith(`${path}/`)
  })
  return match ?? null
}
