import { createSearchParams, Outlet, ScrollRestoration, useLocation, useNavigate } from 'react-router'
import NavBar, { type Utility } from '../components/nav/NavBar.tsx'
import CartDrawer from '../components/shop/CartDrawer.tsx'
import { useCart } from '../context/cartContext.ts'
import { pageFromPath, ROUTES } from '../routes.ts'
import { useAuth } from '../context/authContext.ts'

export default function RootLayout() {
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const { isOpen, openCart, closeCart, itemCount } = useCart()
  const auth = useAuth()

  const goToShop = (filter: string | null) =>
    navigate({
      pathname: ROUTES.shop,
      search: filter ? `?${createSearchParams({ filter }).toString()}` : '',
    })

  const handleUtilityChange = (utility: Utility | null) => {
    if (utility === 'cart') openCart()
    else {
      closeCart()
      if (utility === 'account') navigate(auth.user ? ROUTES.account : ROUTES.signIn)
    }
  }

  return (
    <>
      <NavBar
        page={pageFromPath(pathname)}
        onNavigate={(page) => navigate(ROUTES[page])}
        onShopFilter={goToShop}
        onUtilityChange={handleUtilityChange}
        cartOpen={isOpen}
        cartCount={itemCount}
        accountLabel={auth.user ? `Account, ${auth.user.firstName}` : 'Sign in to your account'}
        accountActive={[ROUTES.account, ROUTES.signIn, ROUTES.signUp].some(path => path === pathname)}
      />

      <CartDrawer />

      <main className="pt-(--nav-h)">
        {auth.status === 'error' && <div className="bg-red-50 px-6 py-3 font-display text-sm text-brand-red-dark" role="alert">{auth.error} <button className="font-bold underline" onClick={() => void auth.refresh()}>Retry connection</button></div>}
        <Outlet />
        <ScrollRestoration />
      </main>
    </>
  )
}
