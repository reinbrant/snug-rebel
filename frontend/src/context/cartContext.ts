import { createContext, useContext } from 'react'
import type { CartLine, CartTarget, VariantChange, CartOwner } from '../api/cart'

export type CartContextValue = {
    lines: CartLine[]
    itemCount: number
    subtotal: number
    status: 'loading' | 'ready' | 'error'
    error: string | null
    busy: boolean
    owner: CartOwner

    isOpen: boolean
    openCart: () => void
    closeCart: () => void

    addItem: (target: CartTarget, quantity?: number) => Promise<boolean>
    setQuantity: (lineId: string, quantity: number) => Promise<boolean>
    changeVariant: (lineId: string, change: VariantChange) => Promise<boolean>
    removeLine: (lineId: string) => Promise<boolean>
    clear: () => Promise<boolean>
    refresh: () => Promise<void>
    dismissError: () => void
}

export const CartContext = createContext<CartContextValue | null>(null)

export function useCart(): CartContextValue {
    const ctx = useContext(CartContext)
    if (!ctx) {
        throw new Error('useCart must be used within a <CartProvider>')
    }
    return ctx
}
