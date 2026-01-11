import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from '../App'
import { db } from '../lib/database'
import { syncService } from '../services/SyncService'
import type { Product, Transaction } from '../lib/database'

// Mock Supabase
vi.mock('../lib/supabase', () => {
  const mockSupabase = {
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: null } }),
      getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'test-user', email: 'test@example.com' } } }),
      onAuthStateChange: vi.fn().mockReturnValue({
        data: { subscription: { unsubscribe: vi.fn() } }
      }),
      signInWithPassword: vi.fn().mockResolvedValue({
        data: { user: { id: 'test-user', email: 'test@example.com' } },
        error: null
      }),
      signOut: vi.fn().mockResolvedValue({ error: null })
    },
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      upsert: vi.fn().mockResolvedValue({ error: null }),
      insert: vi.fn().mockResolvedValue({ error: null })
    })
  }
  
  return {
    supabase: mockSupabase
  }
})

// Mock PWA components
vi.mock('../components/PWAInstallPrompt', () => ({
  PWAInstallPrompt: () => null
}))

vi.mock('../components/PWAUpdatePrompt', () => ({
  PWAUpdatePrompt: () => null
}))

// Mock virtual PWA register
vi.mock('virtual:pwa-register/react', () => ({
  useRegisterSW: () => ({
    needRefresh: false,
    offlineReady: false,
    updateServiceWorker: vi.fn()
  })
}))

// Mock console methods to avoid noise in tests
const originalConsoleLog = console.log
const originalConsoleError = console.error

describe('End-to-End Integration Tests', () => {
  let user: ReturnType<typeof userEvent.setup>
  let mockSupabase: any

  beforeEach(async () => {
    user = userEvent.setup()
    
    // Get the mocked supabase
    const { supabase } = await import('../lib/supabase')
    mockSupabase = supabase
    
    // Clear all data
    await db.products.clear()
    await db.transactions.clear()
    await db.drafts.clear()
    localStorage.clear()
    
    // Mock console to reduce noise
    console.log = vi.fn()
    console.error = vi.fn()
    
    // Reset all mocks
    vi.clearAllMocks()
    
    // Setup authenticated state
    mockSupabase.auth.getSession.mockResolvedValue({
      data: { session: { user: { id: 'test-user', email: 'test@example.com' } } }
    })
  })

  afterEach(() => {
    // Restore console
    console.log = originalConsoleLog
    console.error = originalConsoleError
    
    // Stop any running sync
    syncService.stopPeriodicSync()
  })

  describe('Complete User Workflow', () => {
    it('should handle complete sales workflow: search → add to cart → checkout → receipt', async () => {
      // Setup test products
      const testProducts: Product[] = [
        {
          id: 'prod-1',
          name: 'Mama หมู',
          description: 'บะหมี่กึ่งสำเร็จรูป',
          costPrice: 15,
          sellingPrice: 25,
          quantity: 50,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date()
        },
        {
          id: 'prod-2',
          name: 'น้ำดื่ม',
          description: 'น้ำดื่มขวด 600ml',
          costPrice: 8,
          sellingPrice: 15,
          quantity: 30,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ]

      await db.products.bulkPut(testProducts)

      render(<App />)

      // Wait for app to load and show dashboard
      await waitFor(() => {
        expect(screen.getByText('หน้าหลัก')).toBeInTheDocument()
      })

      // Step 1: Search for products
      const searchInput = screen.getByPlaceholderText('ค้นหาสินค้า...')
      await user.type(searchInput, 'Mama')

      // Wait for search results
      await waitFor(() => {
        expect(screen.getByText('Mama หมู')).toBeInTheDocument()
      })

      // Step 2: Add product to cart
      const productResult = screen.getByText('Mama หมู')
      await user.click(productResult)

      // Verify item added to cart
      await waitFor(() => {
        expect(screen.getByText('รายการในตะกร้า')).toBeInTheDocument()
        expect(screen.getByText('฿25.00')).toBeInTheDocument()
      })

      // Step 3: Add another product
      await user.clear(searchInput)
      await user.type(searchInput, 'น้ำ')

      await waitFor(() => {
        expect(screen.getByText('น้ำดื่ม')).toBeInTheDocument()
      })

      const waterProduct = screen.getByText('น้ำดื่ม')
      await user.click(waterProduct)

      // Verify both items in cart with correct total
      await waitFor(() => {
        expect(screen.getByText('฿40.00')).toBeInTheDocument() // 25 + 15
      })

      // Step 4: Complete transaction (checkout)
      const payButton = screen.getByText('ชำระเงิน')
      await user.click(payButton)

      // Verify transaction completed
      await waitFor(() => {
        // Cart should be cleared
        expect(screen.getByText('฿0.00')).toBeInTheDocument()
        // Receipt should be generated (check console)
        expect(console.log).toHaveBeenCalledWith(expect.stringContaining('ใบเสร็จรับเงิน'))
      })

      // Step 5: Verify transaction was saved to database
      const transactions = await db.transactions.toArray()
      expect(transactions).toHaveLength(1)
      expect(transactions[0].total).toBe(40)
      expect(transactions[0].items).toHaveLength(2)
      expect(transactions[0].synced).toBe(false)

      // Step 6: Verify inventory was deducted
      const updatedProducts = await db.products.toArray()
      const mamaProduct = updatedProducts.find(p => p.id === 'prod-1')
      const waterProduct2 = updatedProducts.find(p => p.id === 'prod-2')
      
      expect(mamaProduct?.quantity).toBe(49) // 50 - 1
      expect(waterProduct2?.quantity).toBe(29) // 30 - 1
    })

    it('should handle draft management workflow', async () => {
      // Setup test product
      const testProduct: Product = {
        id: 'prod-1',
        name: 'Test Product',
        description: 'Test Description',
        costPrice: 20,
        sellingPrice: 30,
        quantity: 10,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      }

      await db.products.put(testProduct)

      render(<App />)

      await waitFor(() => {
        expect(screen.getByText('หน้าหลัก')).toBeInTheDocument()
      })

      // Add item to cart
      const searchInput = screen.getByPlaceholderText('ค้นหาสินค้า...')
      await user.type(searchInput, 'Test')

      await waitFor(() => {
        expect(screen.getByText('Test Product')).toBeInTheDocument()
      })

      await user.click(screen.getByText('Test Product'))

      // Verify item in cart
      await waitFor(() => {
        expect(screen.getByText('฿30.00')).toBeInTheDocument()
      })

      // Save as draft
      const saveDraftButton = screen.getByText('บันทึกร่าง')
      await user.click(saveDraftButton)

      // Verify cart cleared and draft saved
      await waitFor(() => {
        expect(screen.getByText('฿0.00')).toBeInTheDocument()
      })

      // Check draft was saved to database
      const drafts = await db.drafts.toArray()
      expect(drafts).toHaveLength(1)
      expect(drafts[0].total).toBe(30)

      // Load draft back
      const loadDraftButton = screen.getByText('โหลดร่าง')
      await user.click(loadDraftButton)

      // Verify cart restored
      await waitFor(() => {
        expect(screen.getByText('฿30.00')).toBeInTheDocument()
      })

      // Verify draft removed from database
      const remainingDrafts = await db.drafts.toArray()
      expect(remainingDrafts).toHaveLength(0)
    })
  })

  describe('Offline/Online Transitions', () => {
    it('should work offline and sync when coming back online', async () => {
      // Start offline
      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        value: false
      })

      const testProduct: Product = {
        id: 'prod-1',
        name: 'Offline Product',
        description: 'Test offline functionality',
        costPrice: 10,
        sellingPrice: 20,
        quantity: 5,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      }

      await db.products.put(testProduct)

      render(<App />)

      await waitFor(() => {
        expect(screen.getByText('หน้าหลัก')).toBeInTheDocument()
      })

      // Verify offline functionality - search and add to cart
      const searchInput = screen.getByPlaceholderText('ค้นหาสินค้า...')
      await user.type(searchInput, 'Offline')

      await waitFor(() => {
        expect(screen.getByText('Offline Product')).toBeInTheDocument()
      })

      await user.click(screen.getByText('Offline Product'))

      // Complete transaction while offline
      await waitFor(() => {
        expect(screen.getByText('฿20.00')).toBeInTheDocument()
      })

      const payButton = screen.getByText('ชำระเงิน')
      await user.click(payButton)

      // Verify transaction saved locally but not synced
      await waitFor(async () => {
        const transactions = await db.transactions.toArray()
        expect(transactions).toHaveLength(1)
        expect(transactions[0].synced).toBe(false)
      })

      // Simulate coming back online
      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        value: true
      })

      // Trigger online event
      window.dispatchEvent(new Event('online'))

      // Wait for sync to complete
      await waitFor(() => {
        expect(mockSupabase.from).toHaveBeenCalledWith('transactions')
      }, { timeout: 3000 })

      // Verify sync was attempted
      expect(mockSupabase.from().upsert).toHaveBeenCalled()
    })

    it('should handle network failures gracefully', async () => {
      // Setup online but with failing network requests
      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        value: true
      })

      mockSupabase.from().upsert.mockRejectedValue(new Error('Network error'))

      const testProduct: Product = {
        id: 'prod-1',
        name: 'Network Test Product',
        description: 'Test network failure handling',
        costPrice: 10,
        sellingPrice: 20,
        quantity: 5,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      }

      await db.products.put(testProduct)

      render(<App />)

      await waitFor(() => {
        expect(screen.getByText('หน้าหลัก')).toBeInTheDocument()
      })

      // Complete a transaction
      const searchInput = screen.getByPlaceholderText('ค้นหาสินค้า...')
      await user.type(searchInput, 'Network')

      await waitFor(() => {
        expect(screen.getByText('Network Test Product')).toBeInTheDocument()
      })

      await user.click(screen.getByText('Network Test Product'))

      const payButton = screen.getByText('ชำระเงิน')
      await user.click(payButton)

      // Verify transaction saved locally despite sync failure
      await waitFor(async () => {
        const transactions = await db.transactions.toArray()
        expect(transactions).toHaveLength(1)
        expect(transactions[0].synced).toBe(false) // Should remain unsynced due to network error
      })

      // Verify app continues to function normally
      expect(screen.getByText('หน้าหลัก')).toBeInTheDocument()
    })
  })

  describe('Data Consistency Across Sync Operations', () => {
    it('should maintain data consistency during sync operations', async () => {
      // Setup initial data
      const localProduct: Product = {
        id: 'prod-1',
        name: 'Local Product',
        description: 'Created locally',
        costPrice: 10,
        sellingPrice: 20,
        quantity: 5,
        isActive: true,
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-02')
      }

      await db.products.put(localProduct)

      // Mock cloud data with newer timestamp
      const cloudProduct = {
        id: 'prod-1',
        user_id: 'test-user',
        name: 'Updated Cloud Product',
        description: 'Updated in cloud',
        cost_price: 12,
        selling_price: 22,
        quantity: 8,
        is_active: true,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-03T00:00:00Z' // Newer than local
      }

      mockSupabase.from().select.mockResolvedValue({
        data: [cloudProduct],
        error: null
      })

      // Perform sync
      const syncResult = await syncService.performSync()

      expect(syncResult.success).toBe(true)

      // Verify local data was updated with cloud version (newer timestamp wins)
      const updatedProduct = await db.products.get('prod-1')
      expect(updatedProduct?.name).toBe('Updated Cloud Product')
      expect(updatedProduct?.sellingPrice).toBe(22)
      expect(updatedProduct?.quantity).toBe(8)
    })

    it('should handle transaction sync without data loss', async () => {
      // Create multiple unsynced transactions
      const transactions: Transaction[] = [
        {
          id: 'trans-1',
          items: [
            {
              productId: 'prod-1',
              name: 'Product 1',
              sellingPrice: 20,
              costPrice: 10,
              quantity: 2
            }
          ],
          total: 40,
          totalCost: 20,
          profit: 20,
          timestamp: new Date('2024-01-01'),
          synced: false
        },
        {
          id: 'trans-2',
          items: [
            {
              productId: 'prod-2',
              name: 'Product 2',
              sellingPrice: 15,
              costPrice: 8,
              quantity: 1
            }
          ],
          total: 15,
          totalCost: 8,
          profit: 7,
          timestamp: new Date('2024-01-02'),
          synced: false
        }
      ]

      await db.transactions.bulkPut(transactions)

      // Perform sync
      const syncResult = await syncService.performSync()

      expect(syncResult.success).toBe(true)
      expect(syncResult.syncedTransactions).toBe(2)

      // Verify transactions were marked as synced
      const syncedTransactions = await db.transactions.toArray()
      expect(syncedTransactions.every(t => t.synced)).toBe(true)

      // Verify cloud sync was called with correct data
      expect(mockSupabase.from().upsert).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            id: 'trans-1',
            total: 40,
            profit: 20
          }),
          expect.objectContaining({
            id: 'trans-2',
            total: 15,
            profit: 7
          })
        ]),
        { onConflict: 'id' }
      )
    })

    it('should handle empty local database initialization', async () => {
      // Ensure local database is empty
      await db.products.clear()
      await db.transactions.clear()

      // Mock cloud data
      const cloudProducts = [
        {
          id: 'cloud-prod-1',
          user_id: 'test-user',
          name: 'Cloud Product 1',
          description: 'From cloud',
          cost_price: 10,
          selling_price: 20,
          quantity: 5,
          is_active: true,
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z'
        }
      ]

      const cloudTransactions = [
        {
          id: 'cloud-trans-1',
          user_id: 'test-user',
          items: [{ productId: 'cloud-prod-1', name: 'Cloud Product 1', sellingPrice: 20, costPrice: 10, quantity: 1 }],
          total: 20,
          total_cost: 10,
          profit: 10,
          timestamp: '2024-01-01T00:00:00Z'
        }
      ]

      // Mock different endpoints for products and transactions
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'products') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            order: vi.fn().mockReturnThis(),
            upsert: vi.fn().mockResolvedValue({ error: null }),
            then: vi.fn().mockResolvedValue({ data: cloudProducts, error: null })
          }
        } else if (table === 'transactions') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            order: vi.fn().mockReturnThis(),
            upsert: vi.fn().mockResolvedValue({ error: null }),
            then: vi.fn().mockResolvedValue({ data: cloudTransactions, error: null })
          }
        }
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          order: vi.fn().mockReturnThis(),
          upsert: vi.fn().mockResolvedValue({ error: null })
        }
      })

      // Perform sync
      const syncResult = await syncService.performSync()

      expect(syncResult.success).toBe(true)
      expect(syncResult.pulledProducts).toBe(1)
      expect(syncResult.pulledTransactions).toBe(1)

      // Verify data was pulled to local database
      const localProducts = await db.products.toArray()
      const localTransactions = await db.transactions.toArray()

      expect(localProducts).toHaveLength(1)
      expect(localProducts[0].name).toBe('Cloud Product 1')

      expect(localTransactions).toHaveLength(1)
      expect(localTransactions[0].total).toBe(20)
      expect(localTransactions[0].synced).toBe(true) // Should be marked as synced
    })
  })

  describe('Property-Based Test Coverage Validation', () => {
    it('should validate cart total calculation property across multiple scenarios', async () => {
      const testProducts: Product[] = [
        {
          id: 'prop-1',
          name: 'Property Test 1',
          description: 'For property testing',
          costPrice: 5.50,
          sellingPrice: 10.75,
          quantity: 100,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date()
        },
        {
          id: 'prop-2',
          name: 'Property Test 2',
          description: 'For property testing',
          costPrice: 12.25,
          sellingPrice: 25.50,
          quantity: 50,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ]

      await db.products.bulkPut(testProducts)

      render(<App />)

      await waitFor(() => {
        expect(screen.getByText('หน้าหลัก')).toBeInTheDocument()
      })

      // Test multiple combinations of cart items
      const searchInput = screen.getByPlaceholderText('ค้นหาสินค้า...')

      // Add first product multiple times
      await user.type(searchInput, 'Property Test 1')
      await waitFor(() => {
        expect(screen.getByText('Property Test 1')).toBeInTheDocument()
      })

      // Add 3 units of first product
      for (let i = 0; i < 3; i++) {
        await user.click(screen.getByText('Property Test 1'))
      }

      // Verify total: 3 * 10.75 = 32.25
      await waitFor(() => {
        expect(screen.getByText('฿32.25')).toBeInTheDocument()
      })

      // Add second product
      await user.clear(searchInput)
      await user.type(searchInput, 'Property Test 2')
      await waitFor(() => {
        expect(screen.getByText('Property Test 2')).toBeInTheDocument()
      })

      // Add 2 units of second product
      for (let i = 0; i < 2; i++) {
        await user.click(screen.getByText('Property Test 2'))
      }

      // Verify total: (3 * 10.75) + (2 * 25.50) = 32.25 + 51.00 = 83.25
      await waitFor(() => {
        expect(screen.getByText('฿83.25')).toBeInTheDocument()
      })

      // Complete transaction and verify inventory deduction property
      const payButton = screen.getByText('ชำระเงิน')
      await user.click(payButton)

      await waitFor(async () => {
        const updatedProducts = await db.products.toArray()
        const product1 = updatedProducts.find(p => p.id === 'prop-1')
        const product2 = updatedProducts.find(p => p.id === 'prop-2')

        // Verify inventory deduction property: original - sold = remaining
        expect(product1?.quantity).toBe(97) // 100 - 3
        expect(product2?.quantity).toBe(48) // 50 - 2
      })
    })

    it('should validate transaction price isolation property', async () => {
      const testProduct: Product = {
        id: 'isolation-test',
        name: 'Price Isolation Test',
        description: 'Test price isolation',
        costPrice: 10,
        sellingPrice: 20,
        quantity: 10,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      }

      await db.products.put(testProduct)

      render(<App />)

      await waitFor(() => {
        expect(screen.getByText('หน้าหลัก')).toBeInTheDocument()
      })

      // Complete a transaction
      const searchInput = screen.getByPlaceholderText('ค้นหาสินค้า...')
      await user.type(searchInput, 'Price Isolation')

      await waitFor(() => {
        expect(screen.getByText('Price Isolation Test')).toBeInTheDocument()
      })

      await user.click(screen.getByText('Price Isolation Test'))
      
      const payButton = screen.getByText('ชำระเงิน')
      await user.click(payButton)

      // Get the transaction
      const transactions = await db.transactions.toArray()
      expect(transactions).toHaveLength(1)
      const originalTransaction = transactions[0]

      // Verify original prices in transaction
      expect(originalTransaction.items[0].sellingPrice).toBe(20)
      expect(originalTransaction.items[0].costPrice).toBe(10)
      expect(originalTransaction.total).toBe(20)

      // Change product prices
      const updatedProduct = { ...testProduct, sellingPrice: 30, costPrice: 15 }
      await db.products.put(updatedProduct)

      // Verify transaction prices remain unchanged (price isolation property)
      const unchangedTransactions = await db.transactions.toArray()
      const unchangedTransaction = unchangedTransactions[0]

      expect(unchangedTransaction.items[0].sellingPrice).toBe(20) // Still original price
      expect(unchangedTransaction.items[0].costPrice).toBe(10) // Still original price
      expect(unchangedTransaction.total).toBe(20) // Still original total
    })

    it('should validate search functionality properties', async () => {
      const testProducts: Product[] = [
        {
          id: 'search-1',
          name: 'Mama Pork Noodles',
          description: 'บะหมี่กึ่งสำเร็จรูป รสหมู',
          costPrice: 10,
          sellingPrice: 20,
          quantity: 10,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date()
        },
        {
          id: 'search-2',
          name: 'Water Bottle',
          description: 'น้ำดื่มขวด 600ml',
          costPrice: 8,
          sellingPrice: 15,
          quantity: 20,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date()
        },
        {
          id: 'search-3',
          name: 'Mama Chicken Noodles',
          description: 'บะหมี่กึ่งสำเร็จรูป รสไก่',
          costPrice: 10,
          sellingPrice: 20,
          quantity: 15,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ]

      await db.products.bulkPut(testProducts)

      render(<App />)

      await waitFor(() => {
        expect(screen.getByText('หน้าหลัก')).toBeInTheDocument()
      })

      const searchInput = screen.getByPlaceholderText('ค้นหาสินค้า...')

      // Test tokenization property: "Mama Pork" should match "Mama Pork Noodles"
      await user.type(searchInput, 'Mama Pork')

      await waitFor(() => {
        expect(screen.getByText('Mama Pork Noodles')).toBeInTheDocument()
        expect(screen.queryByText('Mama Chicken Noodles')).not.toBeInTheDocument()
        expect(screen.queryByText('Water Bottle')).not.toBeInTheDocument()
      })

      // Test partial matching: "Mama" should match both Mama products
      await user.clear(searchInput)
      await user.type(searchInput, 'Mama')

      await waitFor(() => {
        expect(screen.getByText('Mama Pork Noodles')).toBeInTheDocument()
        expect(screen.getByText('Mama Chicken Noodles')).toBeInTheDocument()
        expect(screen.queryByText('Water Bottle')).not.toBeInTheDocument()
      })

      // Test Thai text search: "น้ำ" should match water bottle
      await user.clear(searchInput)
      await user.type(searchInput, 'น้ำ')

      await waitFor(() => {
        expect(screen.getByText('Water Bottle')).toBeInTheDocument()
        expect(screen.queryByText('Mama Pork Noodles')).not.toBeInTheDocument()
        expect(screen.queryByText('Mama Chicken Noodles')).not.toBeInTheDocument()
      })
    })
  })
})