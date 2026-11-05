import { apiFetch, resolveAssetUrl } from './api'
import { MOCK_PRODUCTS } from '../data/products'

export type ItemColor = { name: string; hex: string }
export type ItemSize = { label: string; available: boolean }
export type ItemVariant = {
    id: string
    color: string
    size: string
    stock: number
    priceOverride?: number
}

export type ItemDetail = {
    id: string
    name: string
    description: string
    imageSrc: string
    price: number
    salePrice?: number
    rating: number
    reviewCount: number
    soldCount: number
    stock: number
    colors: ItemColor[]
    sizes: ItemSize[]
    variants?: ItemVariant[]
}

export type Review = {
    id: string
    author: string
    rating: number
    body: string
    postedAt: string
    verified: boolean
}

const DEFAULT_DETAILS = {
    description:
        'Rule-breaking comfort meets effortless street style. Built for those who refuse to compromise between a razor-sharp aesthetic and all-day wearability.',
    colors: [
        { name: 'Blood red', hex: '#9f0a0a' },
        { name: 'Midnight purple', hex: '#2a1a5e' },
        { name: 'Gold', hex: '#e8c35a' },
    ],
    sizes: ['S', 'M', 'L', 'XL', '2X'].map((label) => ({ label, available: true })),
}

function buildMockVariants(productId: string, stock = 10): ItemVariant[] {
    const variants: ItemVariant[] = []
    for (const color of DEFAULT_DETAILS.colors) {
        for (const size of DEFAULT_DETAILS.sizes) {
            if (!size.available) continue
            variants.push({
                id: `var_${productId}_${color.name}_${size.label}`,
                color: color.name,
                size: size.label,
                stock,
            })
        }
    }
    return variants
}

function buildMockItemDetail(id: string): ItemDetail | null {
    const product = MOCK_PRODUCTS.find((p) => p.id === id)
    if (!product) return null
    const stock = product.stockLeft ?? 10
    return {
        id: product.id,
        name: product.name,
        description: DEFAULT_DETAILS.description,
        imageSrc: product.imageSrc,
        price: product.price,
        salePrice: product.salePrice,
        rating: product.rating,
        reviewCount: product.reviewCount,
        soldCount: product.soldCount,
        stock,
        colors: DEFAULT_DETAILS.colors,
        sizes: DEFAULT_DETAILS.sizes,
        variants: buildMockVariants(product.id, stock),
    }
}

// Mock-mode only: finds the mock variant for a product + size (first size if none given)
export function findMockVariantBySize(
    productId: string,
    size?: string | null,
): { item: ItemDetail; variant: ItemVariant } | null {
    const item = buildMockItemDetail(productId)
    if (!item?.variants?.length) return null
    const variant = size
        ? item.variants.find((v) => v.size.toLowerCase() === size.toLowerCase())
        : item.variants[0]
    return variant ? { item, variant } : null
}

// Used by cart.mock.ts to hydrate stored variant IDs into full cart line items
export async function findMockVariant(
    variantId: string,
): Promise<{ item: ItemDetail; variant: ItemVariant } | null> {
    for (const p of MOCK_PRODUCTS) {
        const detail = buildMockItemDetail(p.id)
        if (!detail) continue
        const variant = detail.variants?.find((v) => v.id === variantId)
        if (variant) return { item: detail, variant }
    }
    // Fallback if a raw product ID was passed
    const fallbackItem = buildMockItemDetail(variantId)
    if (fallbackItem && fallbackItem.variants?.[0]) {
        return { item: fallbackItem, variant: fallbackItem.variants[0] }
    }
    return null
}

const MOCK_REVIEWS: Review[] = [
    {
        id: 'r1',
        author: 'Samantha D.',
        rating: 4.5,
        body: 'The drape on this shirt is insane. The heavyweight cotton actually feels premium, not just thick and stiff like other streetwear brands.',
        postedAt: '2023-08-14',
        verified: true,
    },
    {
        id: 'r3',
        author: 'Reinbrant M.',
        rating: 4,
        body: 'Maganda po haha. Bili po ulit ako next sahod ko kasi sobrang worth it talaga at totoong komportable siya. Perfect ito para sa mga 24 year old like me.',
        postedAt: '2023-08-15',
        verified: true,
    },
]

const simulateNetwork = () => new Promise((resolve) => setTimeout(resolve, 150))

export async function getItem(id: string): Promise<ItemDetail | null> {
    if (import.meta.env.VITE_USE_MOCK_API === 'true') {
        await simulateNetwork()
        return buildMockItemDetail(id)
    }
    try {
        const item = await apiFetch<ItemDetail>(`/Product/GetProductByID/${encodeURIComponent(id)}`)
        return { ...item, imageSrc: resolveAssetUrl(item.imageSrc) }
    } catch (error) {
        if (error instanceof Error && error.message.includes('404')) {
            return null
        }
        throw error
    }
}

export async function getItemReviews(id: string): Promise<Review[]> {
    if (import.meta.env.VITE_USE_MOCK_API === 'true') {
        await simulateNetwork()
        return MOCK_REVIEWS
    }
    const rows = await apiFetch<Array<{ pkReviewId: string; userDisplayName?: string; rating: number; body?: string; createdAt: string }>>(`/Review/product/${encodeURIComponent(id)}`)
    return rows.map(r => ({ id: r.pkReviewId, author: r.userDisplayName || 'Customer', rating: r.rating,
        body: r.body || '', postedAt: r.createdAt, verified: true }))
}
