import type { Product } from '../lib/database'
import type { TransactionResult } from '../services/TransactionService'

export interface CartItem {
  productId: string
  name: string
  sellingPrice: number
  costPrice: number
  quantity: number
}

export interface Draft {
  id?: string
  items: CartItem[]
  total: number
  createdAt: Date
}

export interface CartContextType {
  items: CartItem[]
  addItem: (product: Product) => void
  removeItem: (productId: string) => void
  updateQuantity: (productId: string, quantity: number) => void
  clearCart: () => void
  total: number
  saveDraft: () => Promise<void>
  loadDraft: (draftId: string) => Promise<void>
  drafts: Draft[]
  loading: boolean
  checkout: () => Promise<TransactionResult>
}