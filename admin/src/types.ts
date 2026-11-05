export type AuthUser = {
  pkUserId?: string
  userEmail: string
  firstName: string
  lastName: string
  phoneNumber?: string
  role: string
  isActive: boolean
}

export type SessionUser = {
  user: AuthUser
  provider: 'email' | 'oauth'
}

export type ProductVariantItem = {
  id: string
  sku: string
  size: string
  color: string
  sizeId: number | null
  colorId: number | null
  stock: number
  priceOverride?: number | null
  isActive: boolean
}

export type Product3DModelItem = {
  id: string
  productId: string
  modelUrl: string
  previewImageUrl?: string
  modelName?: string
  fileSizeBytes: number
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export type ProductItem = {
  id: string
  displayId: string
  slug: string
  name: string
  category: string
  categoryId?: string
  description?: string
  price: number
  material?: string
  stock: number
  isActive: boolean
  status: 'Active' | 'Low stock' | 'Draft' | 'Inactive'
  sku: string
  variants: ProductVariantItem[]
  hasSizes: boolean
  hasColors: boolean
  images: Array<{ url: string; altText?: string }>
  models3D?: Product3DModelItem[]
}

export type CategoryItem = {
  id: string
  name: string
  slug: string
  products: number
  status: 'Active' | 'Hidden'
}

export type CollectionItem = {
  id: string
  name: string
  products: number
  status: 'Live' | 'Scheduled'
  launch: string
}

export type OrderStatus = 'Pending' | 'Paid' | 'Processing' | 'Shipped' | 'Delivered' | 'Cancelled' | 'Refunded'

export type OrderItem = {
  orderId?: string
  id: string
  customer: string
  total: number
  status: OrderStatus
  date: string
  channel: 'Web' | 'Marketplace' | 'In-store'
  shippingAddress?: string
  items?: Array<{ name: string; qty: number; price: number }>
  paymentMethod?: 'Card' | 'GCash' | 'Maya' | 'Bank transfer' | 'COD'
}
