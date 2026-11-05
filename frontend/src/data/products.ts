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
    categories: Category[]
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

export async function getProducts(): Promise<Product[]> {
    if (import.meta.env.VITE_USE_MOCK_API === 'true') {
        return MOCK_PRODUCTS
    }
    return (await apiFetch<Product[]>('/Product/ProductList')).map(p => ({ ...p, imageSrc: resolveAssetUrl(p.imageSrc) }))
}