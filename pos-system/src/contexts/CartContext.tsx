import React, { createContext, useContext, useEffect, useState, useCallback } from 'react'
import type { Product } from '../lib/database'
import type { CartItem, Draft, CartContextType } from '../types/cart'
import { db } from '../lib/database'
import { transactionService, type TransactionResult } from '../services/TransactionService'

const CartContext = createContext<CartContextType | undefined>(undefined)

export function useCart() {
  const context = useContext(CartContext)
  if (context === undefined) {
    throw new Error('useCart must be used within a CartProvider')
  }
  return context
}

interface CartProviderProps {
  children: React.ReactNode
}

export function CartProvider({ children }: CartProviderProps) {
  const [items, setItems] = useState<CartItem[]>([])
  const [drafts, setDrafts] = useState<Draft[]>([])
  const [loading, setLoading] = useState(false)

  // Load drafts on mount
  useEffect(() => {
    loadDrafts()
  }, [])

  const loadDrafts = useCallback(async () => {
    try {
      const draftRecords = await db.drafts.orderBy('createdAt').reverse().toArray()
      setDrafts(draftRecords
        .filter(draft => draft.id !== undefined)
        .map(draft => ({
          id: draft.id!,
          items: draft.items,
          total: draft.total,
          createdAt: draft.createdAt
        })))
    } catch (error) {
      console.error('Failed to load drafts:', error)
    }
  }, [])

  // Calculate total whenever items change
  const total = React.useMemo(() => {
    return items.reduce((sum, item) => sum + (item.sellingPrice * item.quantity), 0)
  }, [items])

  const addItem = useCallback((product: Product) => {
    if (!product.id) return

    setItems(prevItems => {
      const existingItemIndex = prevItems.findIndex(item => item.productId === product.id)
      
      if (existingItemIndex >= 0) {
        // Update quantity of existing item
        const updatedItems = [...prevItems]
        updatedItems[existingItemIndex] = {
          ...updatedItems[existingItemIndex],
          quantity: updatedItems[existingItemIndex].quantity + 1
        }
        return updatedItems
      } else {
        // Add new item
        const newItem: CartItem = {
          productId: product.id!,
          name: product.name,
          sellingPrice: product.sellingPrice,
          costPrice: product.costPrice,
          quantity: 1
        }
        return [...prevItems, newItem]
      }
    })
  }, [])

  const removeItem = useCallback((productId: string) => {
    setItems(prevItems => prevItems.filter(item => item.productId !== productId))
  }, [])

  const updateQuantity = useCallback((productId: string, quantity: number) => {
    if (quantity <= 0) {
      removeItem(productId)
      return
    }

    setItems(prevItems =>
      prevItems.map(item =>
        item.productId === productId
          ? { ...item, quantity }
          : item
      )
    )
  }, [removeItem])

  const clearCart = useCallback(() => {
    setItems([])
  }, [])

  const saveDraft = useCallback(async () => {
    if (items.length === 0) {
      throw new Error('Cannot save empty cart as draft')
    }

    setLoading(true)
    try {
      const draft = {
        items: [...items],
        total,
        createdAt: new Date()
      }

      await db.drafts.add(draft)
      await loadDrafts() // Refresh drafts list
      clearCart() // Clear current cart after saving draft
    } catch (error) {
      console.error('Failed to save draft:', error)
      throw error
    } finally {
      setLoading(false)
    }
  }, [items, total, loadDrafts, clearCart])

  const loadDraft = useCallback(async (draftId: string) => {
    setLoading(true)
    try {
      const draft = await db.drafts.get(draftId)
      if (!draft) {
        throw new Error('Draft not found')
      }

      // Load draft items into cart
      setItems([...draft.items])

      // Remove draft from database
      await db.drafts.delete(draftId)
      await loadDrafts() // Refresh drafts list
    } catch (error) {
      console.error('Failed to load draft:', error)
      throw error
    } finally {
      setLoading(false)
    }
  }, [loadDrafts])

  const checkout = useCallback(async (): Promise<TransactionResult> => {
    if (items.length === 0) {
      return {
        transaction: {} as any,
        success: false,
        error: 'Cannot checkout with empty cart'
      }
    }

    setLoading(true)
    try {
      const result = await transactionService.createTransaction({ items })
      
      if (result.success) {
        // Clear cart after successful transaction
        clearCart()
      }
      
      return result
    } catch (error) {
      console.error('Checkout failed:', error)
      return {
        transaction: {} as any,
        success: false,
        error: error instanceof Error ? error.message : 'Checkout failed'
      }
    } finally {
      setLoading(false)
    }
  }, [items, clearCart])

  const value: CartContextType = {
    items,
    addItem,
    removeItem,
    updateQuantity,
    clearCart,
    total,
    saveDraft,
    loadDraft,
    drafts,
    loading,
    checkout
  }

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>
}