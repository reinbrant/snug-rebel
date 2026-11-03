import { ApiError, apiFetch } from './api'
import { EMPTY_CART, type Cart, type CartOwner, type CartTarget, type VariantChange } from './cart.types'

type CartItemDTO = {
    pkCartItemId: string
    fkCartId: string
    fkProductVariantId: string
    quantity: number
    productId?: string
    productName?: string
    imageUrl?: string | null
    unitPrice?: number
    colorName?: string | null
    sizeLabel?: string | null
    stockQuantity?: number
}

type CartDTO = {
    pkCartId: string
    items: CartItemDTO[]
}

const toCart = (dto: CartDTO): Cart => ({
    id: dto.pkCartId,
    lines: dto.items.map((i) => ({
        id: i.pkCartItemId,
        variantId: i.fkProductVariantId,
        productId: i.productId ?? '',
        name: i.productName ?? 'Item',
        imageUrl: i.imageUrl ?? null,
        unitPrice: i.unitPrice ?? 0,
        color: i.colorName ?? null,
        size: i.sizeLabel ?? null,
        quantity: i.quantity,
        stock: i.stockQuantity ?? 99,
    })),
})

const ownerEndpoint = (owner: CartOwner) =>
    'userId' in owner
        ? `/Cart/user/${encodeURIComponent(owner.userId)}`
        : `/Cart/session/${encodeURIComponent(owner.sessionToken)}`

export async function fetchCart(owner: CartOwner): Promise<Cart> {
    try {
        return toCart(await apiFetch<CartDTO>(ownerEndpoint(owner)))
    } catch (e) {
        if (e instanceof ApiError && e.status === 404) return EMPTY_CART
        throw e
    }
}

export async function addToCart(owner: CartOwner, target: CartTarget, quantity = 1): Promise<Cart> {
    const dto = await apiFetch<CartDTO>('/Cart/add', {
        method: 'POST',
        body: JSON.stringify({ ...owner, productId: target.productId, size: target.size ?? null, quantity }),
    })
    return toCart(dto)
}

export async function updateCartItem(cartItemId: string, quantity: number): Promise<void> {
    await apiFetch(`/Cart/item/${encodeURIComponent(cartItemId)}`, {
        method: 'PUT',
        body: JSON.stringify({ quantity }),
    })
}

export async function changeCartItemVariant(cartItemId: string, change: VariantChange): Promise<void> {
    await apiFetch(`/Cart/item/${encodeURIComponent(cartItemId)}`, {
        method: 'PUT',
        body: JSON.stringify({ size: change.size ?? null, color: change.color ?? null }),
    })
}

export async function removeCartItem(cartItemId: string): Promise<void> {
    await apiFetch(`/Cart/item/${encodeURIComponent(cartItemId)}`, { method: 'DELETE' })
}

export async function clearCart(cartId: string): Promise<void> {
    await apiFetch(`/Cart/${encodeURIComponent(cartId)}/clear`, { method: 'DELETE' })
}