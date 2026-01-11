import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { CartProvider, useCart } from './CartContext'
import type { Product } from '../lib/database'
import { db } from '../lib/database'

// Test component to access cart context
function TestCartComponent() {
  const {
    items,
    addItem,
    removeItem,
    updateQuantity,
    clearCart,
    total,
    saveDraft,
    loadDraft,
    drafts
  } = useCart()

  const testProduct: Product = {
    id: 'test-1',
    name: 'Test Product',
    description: 'Test Description',
    costPrice: 20,
    sellingPrice: 30,
    quantity: 10,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date()
  }

  return (
    <div>
      <div data-testid="cart-items-count">{items.length}</div>
      <div data-testid="cart-total">{total}</div>
      <div data-testid="drafts-count">{drafts.length}</div>
      
      <button onClick={() => addItem(testProduct)} data-testid="add-item">
        Add Item
      </button>
      <button onClick={() => removeItem('test-1')} data-testid="remove-item">
        Remove Item
      </button>
      <button onClick={() => updateQuantity('test-1', 5)} data-testid="update-quantity">
        Update Quantity
      </button>
      <button onClick={clearCart} data-testid="clear-cart">
        Clear Cart
      </button>
      <button onClick={saveDraft} data-testid="save-draft">
        Save Draft
      </button>
      <button 
        onClick={() => drafts.length > 0 && loadDraft(drafts[0].id!)} 
        data-testid="load-draft"
      >
        Load First Draft
      </button>
      
      {items.map(item => (
        <div key={item.productId} data-testid={`item-${item.productId}`}>
          {item.name} - Qty: {item.quantity} - Price: {item.sellingPrice}
        </div>
      ))}
      
      {drafts.map(draft => (
        <div key={draft.id} data-testid={`draft-${draft.id}`}>
          Draft: {draft.items.length} items - Total: {draft.total}
        </div>
      ))}
    </div>
  )
}

describe('CartContext', () => {
  beforeEach(async () => {
    // Clear any existing data
    localStorage.clear()
    // Clear database drafts
    await db.drafts.clear()
  })

  it('should add items to cart', async () => {
    render(
      <CartProvider>
        <TestCartComponent />
      </CartProvider>
    )

    const addButton = screen.getByTestId('add-item')
    const itemsCount = screen.getByTestId('cart-items-count')
    const total = screen.getByTestId('cart-total')

    expect(itemsCount).toHaveTextContent('0')
    expect(total).toHaveTextContent('0')

    fireEvent.click(addButton)

    await waitFor(() => {
      expect(itemsCount).toHaveTextContent('1')
      expect(total).toHaveTextContent('30')
    })

    // Add same item again - should increase quantity
    fireEvent.click(addButton)

    await waitFor(() => {
      expect(itemsCount).toHaveTextContent('1') // Still 1 unique item
      expect(total).toHaveTextContent('60') // But total should double
    })
  })

  it('should remove items from cart', async () => {
    render(
      <CartProvider>
        <TestCartComponent />
      </CartProvider>
    )

    const addButton = screen.getByTestId('add-item')
    const removeButton = screen.getByTestId('remove-item')
    const itemsCount = screen.getByTestId('cart-items-count')

    fireEvent.click(addButton)
    
    await waitFor(() => {
      expect(itemsCount).toHaveTextContent('1')
    })

    fireEvent.click(removeButton)

    await waitFor(() => {
      expect(itemsCount).toHaveTextContent('0')
    })
  })

  it('should update item quantities', async () => {
    render(
      <CartProvider>
        <TestCartComponent />
      </CartProvider>
    )

    const addButton = screen.getByTestId('add-item')
    const updateButton = screen.getByTestId('update-quantity')
    const total = screen.getByTestId('cart-total')

    fireEvent.click(addButton)
    
    await waitFor(() => {
      expect(total).toHaveTextContent('30')
    })

    fireEvent.click(updateButton)

    await waitFor(() => {
      expect(total).toHaveTextContent('150') // 30 * 5
    })
  })

  it('should clear all items from cart', async () => {
    render(
      <CartProvider>
        <TestCartComponent />
      </CartProvider>
    )

    const addButton = screen.getByTestId('add-item')
    const clearButton = screen.getByTestId('clear-cart')
    const itemsCount = screen.getByTestId('cart-items-count')

    fireEvent.click(addButton)
    fireEvent.click(addButton)
    
    await waitFor(() => {
      expect(itemsCount).toHaveTextContent('1')
    })

    fireEvent.click(clearButton)

    await waitFor(() => {
      expect(itemsCount).toHaveTextContent('0')
    })
  })

  it('should calculate total correctly', async () => {
    render(
      <CartProvider>
        <TestCartComponent />
      </CartProvider>
    )

    const addButton = screen.getByTestId('add-item')
    const total = screen.getByTestId('cart-total')

    // Add item 3 times
    fireEvent.click(addButton)
    fireEvent.click(addButton)
    fireEvent.click(addButton)

    await waitFor(() => {
      expect(total).toHaveTextContent('90') // 30 * 3
    })
  })

  it('should save draft and clear cart', async () => {
    render(
      <CartProvider>
        <TestCartComponent />
      </CartProvider>
    )

    const addButton = screen.getByTestId('add-item')
    const saveDraftButton = screen.getByTestId('save-draft')
    const itemsCount = screen.getByTestId('cart-items-count')
    const draftsCount = screen.getByTestId('drafts-count')

    // Add items to cart
    fireEvent.click(addButton)
    fireEvent.click(addButton)

    await waitFor(() => {
      expect(itemsCount).toHaveTextContent('1')
    })

    // Save as draft
    fireEvent.click(saveDraftButton)

    await waitFor(() => {
      expect(itemsCount).toHaveTextContent('0') // Cart should be cleared
      expect(draftsCount).toHaveTextContent('1') // Should have 1 draft
    })
  })

  it('should load draft and remove it from drafts list', async () => {
    render(
      <CartProvider>
        <TestCartComponent />
      </CartProvider>
    )

    const addButton = screen.getByTestId('add-item')
    const saveDraftButton = screen.getByTestId('save-draft')
    const loadDraftButton = screen.getByTestId('load-draft')
    const itemsCount = screen.getByTestId('cart-items-count')
    const draftsCount = screen.getByTestId('drafts-count')
    const total = screen.getByTestId('cart-total')

    // Add items to cart and save as draft
    fireEvent.click(addButton)
    fireEvent.click(addButton) // 2 quantity
    fireEvent.click(saveDraftButton)

    await waitFor(() => {
      expect(itemsCount).toHaveTextContent('0')
      expect(draftsCount).toHaveTextContent('1')
    })

    // Load the draft
    fireEvent.click(loadDraftButton)

    await waitFor(() => {
      expect(itemsCount).toHaveTextContent('1') // Should restore cart
      expect(total).toHaveTextContent('60') // 30 * 2
      expect(draftsCount).toHaveTextContent('0') // Draft should be removed
    })
  })
})