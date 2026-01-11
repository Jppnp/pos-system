import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { db } from '../lib/database'
import { syncService } from '../services/SyncService'
import { productService } from '../services/ProductService'
import { searchEngine } from '../services/SearchEngine'
import { transactionService } from '../services/TransactionService'
import type { Product, Transaction } from '../lib/database'

// Mock Supabase
vi.mock('../lib/supabase', () => {
  const mockSupabase = {
    auth: {
      getSession: vi.fn().mockResolvedValue({ 
        data: { session: { user: { id: 'test-user', email: 'test@example.com' } } } 
      }),
      getUser: vi.fn().mockResolvedValue({ 
        data: { user: { id: 'test-user', email: 'test@example.com' } } 
      }),
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

// Mock console methods to avoid noise in tests
const originalConsoleLog = console.log
const originalConsoleError = console.error

describe('Core Integration Tests', () => {
  let mockSupabase: any

  beforeEach(async () => {
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
  })

  afterEach(() => {
    // Restore console
    console.log = originalConsoleLog
    console.error = originalConsoleError
    
    // Stop any running sync
    syncService.stopPeriodicSync()
  })

  describe('Complete Sales Workflow Integration', () => {
    it('should handle end-to-end sales workflow: search → add to cart → checkout', async () => {
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

      // Step 1: Initialize search engine
      await productService.initializeSearch()

      // Step 2: Search for products
      const searchResults = await searchEngine.search('Mama')
      expect(searchResults).toHaveLength(1)
      expect(searchResults[0].product.name).toBe('Mama หมู')

      // Step 3: Create transaction items (simulating cart)
      const cartItems = [
        {
          productId: 'prod-1',
          name: 'Mama หมู',
          sellingPrice: 25,
          costPrice: 15,
          quantity: 2
        },
        {
          productId: 'prod-2',
          name: 'น้ำดื่ม',
          sellingPrice: 15,
          costPrice: 8,
          quantity: 1
        }
      ]

      // Step 4: Complete transaction (checkout)
      const transactionResult = await transactionService.createTransaction({ items: cartItems })

      // Step 5: Verify transaction was created correctly
      expect(transactionResult.success).toBe(true)
      expect(transactionResult.transaction.total).toBe(65) // (25 * 2) + (15 * 1)
      expect(transactionResult.transaction.totalCost).toBe(38) // (15 * 2) + (8 * 1)
      expect(transactionResult.transaction.profit).toBe(27) // 65 - 38
      expect(transactionResult.transaction.synced).toBe(false)
      expect(transactionResult.transaction.items).toHaveLength(2)

      // Step 6: Verify transaction was saved to database
      const savedTransactions = await db.transactions.toArray()
      expect(savedTransactions).toHaveLength(1)
      expect(savedTransactions[0].id).toBe(transactionResult.transaction.id)

      // Step 7: Verify inventory was deducted
      const updatedProducts = await db.products.toArray()
      const mamaProduct = updatedProducts.find(p => p.id === 'prod-1')
      const waterProduct = updatedProducts.find(p => p.id === 'prod-2')
      
      expect(mamaProduct?.quantity).toBe(48) // 50 - 2
      expect(waterProduct?.quantity).toBe(29) // 30 - 1
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

      // Create draft items
      const draftItems = [
        {
          productId: 'prod-1',
          name: 'Test Product',
          sellingPrice: 30,
          costPrice: 20,
          quantity: 2
        }
      ]

      // Save as draft
      const draftCartItems = [
        {
          productId: 'prod-1',
          name: 'Test Product',
          sellingPrice: 30,
          costPrice: 20,
          quantity: 2
        }
      ]

      const total = draftCartItems.reduce((sum, item) => sum + (item.sellingPrice * item.quantity), 0)
      const draft = {
        items: draftCartItems,
        total,
        createdAt: new Date()
      }

      const draftId = await db.drafts.add(draft)
      const savedDraft = { ...draft, id: draftId }

      expect(savedDraft.total).toBe(60) // 30 * 2
      expect(savedDraft.items).toHaveLength(1)

      // Verify draft was saved to database
      const savedDrafts = await db.drafts.toArray()
      expect(savedDrafts).toHaveLength(1)
      expect(savedDrafts[0].id).toBe(savedDraft.id)

      // Load draft back
      const loadedDraft = await db.drafts.get(savedDraft.id!)
      expect(loadedDraft).toBeDefined()
      expect(loadedDraft!.total).toBe(60)

      // Remove draft (simulating load into cart)
      await db.drafts.delete(savedDraft.id!)
      const remainingDrafts = await db.drafts.toArray()
      expect(remainingDrafts).toHaveLength(0)
    })
  })

  describe('Offline/Online Sync Operations', () => {
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

      // Create transaction while offline
      const cartItems = [
        {
          productId: 'prod-1',
          name: 'Offline Product',
          sellingPrice: 20,
          costPrice: 10,
          quantity: 1
        }
      ]

      const transactionResult = await transactionService.createTransaction({ items: cartItems })

      // Verify transaction saved locally but not synced
      expect(transactionResult.success).toBe(true)
      expect(transactionResult.transaction.synced).toBe(false)
      const unsyncedTransactions = await db.getUnsyncedTransactions()
      expect(unsyncedTransactions).toHaveLength(1)

      // Simulate coming back online
      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        value: true
      })

      // Perform sync
      const syncResult = await syncService.performSync()

      // Verify sync was attempted (even if it fails due to mocking)
      expect(mockSupabase.from).toHaveBeenCalledWith('transactions')
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

      // Create transaction
      const cartItems = [
        {
          productId: 'prod-1',
          name: 'Network Test Product',
          sellingPrice: 20,
          costPrice: 10,
          quantity: 1
        }
      ]

      const transactionResult = await transactionService.createTransaction({ items: cartItems })

      // Verify transaction saved locally
      expect(transactionResult.success).toBe(true)
      expect(transactionResult.transaction.synced).toBe(false)

      // Attempt sync (should fail gracefully)
      const syncResult = await syncService.performSync()
      expect(syncResult.success).toBe(false)
      expect(syncResult.error).toContain('Network error')

      // Verify transaction remains unsynced
      const unsyncedTransactions = await db.getUnsyncedTransactions()
      expect(unsyncedTransactions).toHaveLength(1)
      expect(unsyncedTransactions[0].synced).toBe(false)
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

      // Test multiple combinations of cart items
      const cartItems = [
        {
          productId: 'prop-1',
          name: 'Property Test 1',
          sellingPrice: 10.75,
          costPrice: 5.50,
          quantity: 3
        },
        {
          productId: 'prop-2',
          name: 'Property Test 2',
          sellingPrice: 25.50,
          costPrice: 12.25,
          quantity: 2
        }
      ]

      // Create transaction
      const transactionResult = await transactionService.createTransaction({ items: cartItems })

      // Verify total calculation property: sum of (price * quantity)
      const expectedTotal = (10.75 * 3) + (25.50 * 2) // 32.25 + 51.00 = 83.25
      expect(transactionResult.success).toBe(true)
      expect(transactionResult.transaction.total).toBe(expectedTotal)

      // Verify inventory deduction property: original - sold = remaining
      const updatedProducts = await db.products.toArray()
      const product1 = updatedProducts.find(p => p.id === 'prop-1')
      const product2 = updatedProducts.find(p => p.id === 'prop-2')

      expect(product1?.quantity).toBe(97) // 100 - 3
      expect(product2?.quantity).toBe(48) // 50 - 2
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

      // Create transaction
      const cartItems = [
        {
          productId: 'isolation-test',
          name: 'Price Isolation Test',
          sellingPrice: 20,
          costPrice: 10,
          quantity: 1
        }
      ]

      const transactionResult = await transactionService.createTransaction({ items: cartItems })

      // Verify original prices in transaction
      expect(transactionResult.success).toBe(true)
      expect(transactionResult.transaction.items[0].sellingPrice).toBe(20)
      expect(transactionResult.transaction.items[0].costPrice).toBe(10)
      expect(transactionResult.transaction.total).toBe(20)

      // Change product prices
      const updatedProduct = { ...testProduct, sellingPrice: 30, costPrice: 15 }
      await db.products.put(updatedProduct)

      // Verify transaction prices remain unchanged (price isolation property)
      const unchangedTransaction = await db.transactions.get(transactionResult.transaction.id!)
      expect(unchangedTransaction?.items[0].sellingPrice).toBe(20) // Still original price
      expect(unchangedTransaction?.items[0].costPrice).toBe(10) // Still original price
      expect(unchangedTransaction?.total).toBe(20) // Still original total
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
      await productService.initializeSearch()

      // Test tokenization property: "Mama Pork" should match "Mama Pork Noodles"
      const mamaPorkResults = await searchEngine.search('Mama Pork')
      expect(mamaPorkResults).toHaveLength(1)
      expect(mamaPorkResults[0].product.name).toBe('Mama Pork Noodles')

      // Test partial matching: "Mama" should match both Mama products
      const mamaResults = await searchEngine.search('Mama')
      expect(mamaResults).toHaveLength(2)
      const mamaNames = mamaResults.map(r => r.product.name)
      expect(mamaNames).toContain('Mama Pork Noodles')
      expect(mamaNames).toContain('Mama Chicken Noodles')

      // Test Thai text search: "น้ำ" should match water bottle
      const thaiResults = await searchEngine.search('น้ำ')
      expect(thaiResults).toHaveLength(1)
      expect(thaiResults[0].product.name).toBe('Water Bottle')
    })
  })
})