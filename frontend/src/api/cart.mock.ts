/* eslint-disable @typescript-eslint/no-unused-vars */
import { findMockVariant, findMockVariantBySize } from './items'
import { ApiError } from './api'
import type { Cart, CartLine, CartOwner, CartTarget, VariantChange } from './cart.types'

const STORAGE_KEY = 'snugrebel.mockCart'

type StoredLine = { id: string; variantId: string; quantity: number }
type StoredCart = { id: string; lines: StoredLine[] }

const delay = () => new Promise((resolve) => setTimeout(resolve, 120))
const uid = (prefix: string) =>
    `${prefix}-${typeof crypto.randomUUID === 'function' ? crypto.randomUUID() : Math.random().toString(36).slice(2)}`

let memoryCart: StoredCart | null = null

function load(): StoredCart {
    try {
        const raw = localStorage.getItem(STORAGE_KEY)
        if (raw) return JSON.parse(raw) as StoredCart
    } catch {
        // storage unavailable or corrupted: start fresh
    }
    return memoryCart ?? { id: uid('cart'), lines: [] }
}

function save(cart: StoredCart) {
    memoryCart = cart
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(cart))
    } catch {
        // just ignore
    }
}

async function hydrate(stored: StoredCart): Promise<Cart> {
    const lines = await Promise.all(
        stored.lines.map(async (line): Promise<CartLine | null> => {
            const found = await findMockVariant(line.variantId)
            if (!found) return null
            const { item, variant } = found
            return {
                id: line.id,
                variantId: line.variantId,
                productId: item.id,
                name: item.name,
                imageUrl: item.imageSrc,
                unitPrice: item.salePrice ?? item.price,
                color: variant.color,
                size: variant.size,
                quantity: line.quantity,
                stock: variant.stock,
            }
        }),
    )
    return { id: stored.id, lines: lines.filter((l): l is CartLine => l !== null) }
}

export async function fetchCart(_owner: CartOwner): Promise<Cart> {
    await delay()
    return hydrate(load())
}

export async function addToCart(_owner: CartOwner, target: CartTarget, quantity = 1): Promise<Cart> {
    await delay()
    const found = findMockVariantBySize(target.productId, target.size)
    const productVariantId = found?.variant.id ?? ''
    if (!found) {
        throw new ApiError({ status: 404, code: 'ProductVariantsNotFound', serverMessage: 'That item isn’t available.' })
    }

    const cart = load()
    const existing = cart.lines.find((l) => l.variantId === productVariantId)
    const nextQuantity = (existing?.quantity ?? 0) + quantity
    if (nextQuantity > found.variant.stock) {
        throw new ApiError({ status: 409, code: 'InsufficientStock', serverMessage: `Only ${found.variant.stock} in stock.` })
    }

    if (existing) existing.quantity = nextQuantity
    else cart.lines.push({ id: uid('c-item'), variantId: productVariantId, quantity })

    save(cart)
    return hydrate(cart)
}

export async function updateCartItem(cartItemId: string, quantity: number): Promise<void> {
    await delay()
    const cart = load()
    const line = cart.lines.find((l) => l.id === cartItemId)
    if (!line) throw new ApiError({ status: 404, code: 'CartItemNotFound', serverMessage: 'That item isn’t in your bag.' })

    if (quantity <= 0) {
        cart.lines = cart.lines.filter((l) => l.id !== cartItemId)
    } else {
        const found = await findMockVariant(line.variantId)
        if (found && quantity > found.variant.stock) {
            throw new ApiError({ status: 409, code: 'InsufficientStock', serverMessage: `Only ${found.variant.stock} in stock.` })
        }
        line.quantity = quantity
    }
    save(cart)
}

export async function changeCartItemVariant(cartItemId: string, change: VariantChange): Promise<void> {
    await delay()
    const cart = load()
    const line = cart.lines.find((l) => l.id === cartItemId)
    if (!line) throw new ApiError({ status: 404, code: 'CartItemNotFound', serverMessage: 'That item isn’t in your bag.' })

    const current = await findMockVariant(line.variantId)
    const unavailable = new ApiError({ status: 404, code: 'ProductVariantNotFound', serverMessage: 'That size or color isn’t available.' })
    if (!current) throw unavailable

    const wantSize = (change.size ?? current.variant.size).toLowerCase()
    const wantColor = (change.color ?? current.variant.color).toLowerCase()
    const target = current.item.variants?.find(
        (v) => v.size.toLowerCase() === wantSize && v.color.toLowerCase() === wantColor,
    )
    if (!target) throw unavailable
    if (target.id === line.variantId) return

    // Already have that exact size + color in the bag? Fold this line into it.
    const twin = cart.lines.find((l) => l.id !== line.id && l.variantId === target.id)
    const nextQuantity = line.quantity + (twin?.quantity ?? 0)
    if (nextQuantity > target.stock) {
        throw new ApiError({ status: 409, code: 'InsufficientStock', serverMessage: `Only ${target.stock} in stock.` })
    }

    if (twin) {
        twin.quantity = nextQuantity
        cart.lines = cart.lines.filter((l) => l.id !== line.id)
    } else {
        line.variantId = target.id
    }
    save(cart)
}

export async function removeCartItem(cartItemId: string): Promise<void> {
    await delay()
    const cart = load()
    cart.lines = cart.lines.filter((l) => l.id !== cartItemId)
    save(cart)
}

export async function clearCart(_cartId: string): Promise<void> {
    await delay()
    const cart = load()
    cart.lines = []
    save(cart)
}