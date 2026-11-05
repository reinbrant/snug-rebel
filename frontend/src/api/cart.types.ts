export type CartLine = {
    id: string
    variantId: string
    productId: string
    name: string
    imageUrl: string | null
    unitPrice: number
    color: string | null
    size: string | null
    quantity: number
    stock: number
}

export type Cart = {
    id: string | null
    lines: CartLine[]
}

export const EMPTY_CART: Cart = { id: null, lines: [] }

// Leave options out to use the product's configured default inventory entry.
export type CartTarget = { productId: string; size?: string | null; color?: string | null; productVariantId?: string }

export type CartOwner = { sessionToken: string } | { userId: string }

// Switch a cart line to another size and/or color of the same product. Leave one out to keep it.
export type VariantChange = { size?: string | null; color?: string | null }