import { RouterProvider } from 'react-router/dom'
import { CartProvider } from './context/CartProvider.tsx'
import { router } from './router.tsx'

export default function App() {
  return (
    <CartProvider>
      <RouterProvider router={router} />
    </CartProvider>
  )
}