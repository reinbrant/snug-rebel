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

// What to add. A size is the variant: the backend finds or creates the row for (product, size).
// Leave size out to get the product's default size.
export type CartTarget = { productId: string; size?: string | null }

export type CartOwner = { sessionToken: string } | { userId: string }

// Switch a cart line to another size and/or color of the same product. Leave one out to keep it.
export type VariantChange = { size?: string | null; color?: string | null }