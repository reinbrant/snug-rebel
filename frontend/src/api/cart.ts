import * as http from './cart.http'
import * as mock from './cart.mock'

export { ApiError } from './api'
export { EMPTY_CART } from './cart.types'
export type { Cart, CartLine, CartOwner, CartTarget, VariantChange } from './cart.types'

const impl = import.meta.env.VITE_USE_MOCK_API === 'true' ? mock : http

export const fetchCart = impl.fetchCart
export const addToCart = impl.addToCart
export const updateCartItem = impl.updateCartItem
export const changeCartItemVariant = impl.changeCartItemVariant
export const removeCartItem = impl.removeCartItem
export const clearCart = impl.clearCart