import { RouterProvider } from 'react-router/dom'
import { AuthProvider } from './context/AuthProvider.tsx'
import { useAuth } from './context/authContext.ts'
import { CartProvider } from './context/CartProvider.tsx'
import { router } from './router.tsx'

export default function App() {
  return <AuthProvider><Storefront /></AuthProvider>
}

function Storefront() {
  const { user } = useAuth()
  return <CartProvider key={user?.pkUserId ?? 'guest'}><RouterProvider router={router} /></CartProvider>
}
