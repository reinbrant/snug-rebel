import { createSearchParams, Outlet, ScrollRestoration, useLocation, useNavigate } from 'react-router'
import NavBar, { type Utility } from '../components/nav/NavBar.tsx'
import CartDrawer from '../components/shop/CartDrawer.tsx'
import { useCart } from '../context/cartContext.ts'
import { pageFromPath, ROUTES } from '../routes.ts'

export default function RootLayout() {
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const { isOpen, openCart, closeCart, itemCount } = useCart()

  const goToShop = (filter: string | null) =>
    navigate({
      pathname: ROUTES.shop,
      search: filter ? `?${createSearchParams({ filter }).toString()}` : '',
    })

  const handleUtilityChange = (utility: Utility | null) => {
    if (utility === 'cart') openCart()
    else closeCart()
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
      />

      <CartDrawer />

      <main className="pt-(--nav-h)">
        <Outlet />
        <ScrollRestoration />
      </main>
    </>
  )
}