import type { ItemBadgeVariant } from '../components/shop/ItemCardBadge'
import { apiFetch, resolveAssetUrl } from '../api/api'

export type Category = 'tops' | 'bottoms' | 'outerwear' | 'best-selling' | 'accessories'
export type SortKey = 'best-selling' | 'name-asc' | 'name-desc' | 'price-asc' | 'price-desc'

export type Product = {
    id: string
    name: string
    imageSrc: string
    price: number
    salePrice?: number
    rating: number
    reviewCount: number
    soldCount: number
    stockLeft?: number
    badge?: ItemBadgeVariant
    categories: string[]
    defaultVariantId?: string
}

export const SORT_OPTIONS: { value: SortKey; label: string }[] = [
    { value: 'best-selling', label: 'Best selling' },
    { value: 'name-asc', label: 'Alphabetically, A-Z' },
    { value: 'name-desc', label: 'Alphabetically, Z-A' },
    { value: 'price-asc', label: 'Price, low to high' },
    { value: 'price-desc', label: 'Price, high to low' },
]

export const CATEGORIES: { value: Category; label: string; sidebar?: boolean }[] = [
    { value: 'tops', label: 'Tops' },
    { value: 'bottoms', label: 'Bottoms' },
    { value: 'outerwear', label: 'Outerwear' },
    { value: 'best-selling', label: 'Best selling', sidebar: false },
    { value: 'accessories', label: 'Accessories' },
]

const PLACEHOLDER =
    'data:image/svg+xml,' +
    encodeURIComponent(
        '<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400"><rect width="400" height="400" fill="#7a7a7a"/></svg>',
    )

export { resolveAssetUrl }

const base = { imageSrc: PLACEHOLDER, rating: 5, reviewCount: 10, soldCount: 20 }

export const MOCK_PRODUCTS: Product[] = [
    { ...base, id: 'p1', name: 'Rebel Oversized Tee', price: 500, badge: 'new', categories: ['tops'], defaultVariantId: 'var_p1_Blood red_S' },
    { ...base, id: 'p2', name: 'Distressed Cargo Pants', price: 500, salePrice: 250, soldCount: 64, categories: ['bottoms', 'best-selling'], defaultVariantId: 'var_p2_Blood red_S' },
    { ...base, id: 'p3', name: 'Heavyweight Zip Hoodie', price: 250, badge: 'lowStock', stockLeft: 5, soldCount: 48, categories: ['outerwear'], defaultVariantId: 'var_p3_Blood red_S' },
    { ...base, id: 'p4', name: 'Boxy Graphic Tee', price: 250, badge: 'lowStock', stockLeft: 5, soldCount: 31, categories: ['tops'], defaultVariantId: 'var_p4_Blood red_S' },
    { ...base, id: 'p5', name: 'Drop-Shoulder Crew', price: 450, badge: 'new', categories: ['tops'], defaultVariantId: 'var_p5_Blood red_S' },
    { ...base, id: 'p6', name: 'Baggy Parachute Pants', price: 600, salePrice: 300, soldCount: 120, categories: ['bottoms', 'best-selling'], defaultVariantId: 'var_p6_Blood red_S' },
    { ...base, id: 'p7', name: 'Utility Bomber Jacket', price: 250, badge: 'lowStock', stockLeft: 5, categories: ['outerwear'], defaultVariantId: 'var_p7_Blood red_S' },
    { ...base, id: 'p8', name: 'Rebel Chain Beanie', price: 250, badge: 'lowStock', stockLeft: 5, categories: ['accessories'], defaultVariantId: 'var_p8_Blood red_S' },
]

interface BackendCategory {
    pkCategoryId: string
    categoryName: string
    slug: string
}

interface Backend3DModel {
    id: string
    productId: string
    modelUrl: string
    previewImageUrl?: string | null
    isActive: boolean
}

const isPlaceholderImage = (src?: string | null) =>
    !src || src.startsWith('data:image/svg+xml')

export async function getProducts(): Promise<Product[]> {
    if (import.meta.env.VITE_USE_MOCK_API === 'true') {
        return MOCK_PRODUCTS
    }

    const [rawProducts, rawCategories] = await Promise.all([
        apiFetch<Product[]>('/Product/ProductList'),
        apiFetch<BackendCategory[]>('/Category').catch(() => [] as BackendCategory[]),
    ])

    const categoryMap = new Map<string, string>()
    for (const c of rawCategories) {
        const slug = (c.slug || c.categoryName || '').trim().toLowerCase()
        if (c.pkCategoryId) categoryMap.set(c.pkCategoryId.toLowerCase(), slug)
        if (c.categoryName) categoryMap.set(c.categoryName.trim().toLowerCase(), slug)
        if (c.slug) categoryMap.set(c.slug.trim().toLowerCase(), slug)
    }

    const enriched = await Promise.all(
        rawProducts.map(async (p) => {
            const normalized = new Set<string>()
            for (const rawCat of p.categories ?? []) {
                const key = String(rawCat).trim().toLowerCase()
                const mapped = categoryMap.get(key)
                if (mapped) normalized.add(mapped)
                normalized.add(key)
            }
            if ((p.soldCount ?? 0) > 0) normalized.add('best-selling')

            let imageSrc = p.imageSrc
            if (isPlaceholderImage(imageSrc)) {
                try {
                    const models = await apiFetch<Backend3DModel[]>(
                        `/Product3DModel/product/${encodeURIComponent(p.id)}`
                    ).catch(() => [] as Backend3DModel[])
                    const activePreview = models.find(m => m.isActive && m.previewImageUrl)?.previewImageUrl
                    if (activePreview) {
                        imageSrc = activePreview
                    }
                } catch {
                    // Ignore fetch errors for card previews
                }
            }

            return {
                ...p,
                imageSrc: resolveAssetUrl(imageSrc),
                categories: Array.from(normalized),
            }
        })
    )

    return enriched
}