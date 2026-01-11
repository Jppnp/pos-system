import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { db } from '../lib/database'
import { syncService } from '../services/SyncService'
import { productService } from '../services/ProductService'
import { searchEngine } from '../services/SearchEngine'
import { transactionService } from '../services/TransactionService'
import type { Product } from '../lib/database'

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

describe('Integration Test Summary', () => {
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

  describe('End-to-End Integration Tests', () => {
    it('should demonstrate complete user workflow integration', async () => {
      // ===== SETUP: Create test products =====
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

      // ===== TEST 1: Search Functionality =====
      await productService.initializeSearch()
      const searchResults = await searchEngine.search('Mama')
      expect(searchResults.length).toBeGreaterThan(0)
      expect(searchResults[0].product.name).toBe('Mama หมู')

      // ===== TEST 2: Transaction Creation =====
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

      const transactionResult = await transactionService.createTransaction({ items: cartItems })
      
      // Verify transaction creation
      expect(transactionResult.success).toBe(true)
      expect(transactionResult.transaction.total).toBe(65) // (25 * 2) + (15 * 1)
      expect(transactionResult.transaction.totalCost).toBe(38) // (15 * 2) + (8 * 1)
      expect(transactionResult.transaction.profit).toBe(27) // 65 - 38
      expect(transactionResult.transaction.synced).toBe(false)

      // ===== TEST 3: Inventory Deduction =====
      const updatedProducts = await db.products.toArray()
      const mamaProduct = updatedProducts.find(p => p.id === 'prod-1')
      const waterProduct = updatedProducts.find(p => p.id === 'prod-2')
      
      expect(mamaProduct?.quantity).toBe(48) // 50 - 2
      expect(waterProduct?.quantity).toBe(29) // 30 - 1

      // ===== TEST 4: Transaction Persistence =====
      const savedTransactions = await db.transactions.toArray()
      expect(savedTransactions).toHaveLength(1)
      expect(savedTransactions[0].total).toBe(65)

      // ===== TEST 5: Price Isolation Property =====
      // Change product prices after transaction
      await db.products.update('prod-1', { sellingPrice: 30, costPrice: 20 })
      
      // Verify transaction prices remain unchanged
      const unchangedTransactions = await db.transactions.toArray()
      expect(unchangedTransactions[0].items[0].sellingPrice).toBe(25) // Still original price
      expect(unchangedTransactions[0].items[0].costPrice).toBe(15) // Still original price

      // ===== TEST 6: Draft Management =====
      const draftItems = [
        {
          productId: 'prod-1',
          name: 'Mama หมู',
          sellingPrice: 25,
          costPrice: 15,
          quantity: 1
        }
      ]

      const draftTotal = draftItems.reduce((sum, item) => sum + (item.sellingPrice * item.quantity), 0)
      const draft = {
        items: draftItems,
        total: draftTotal,
        createdAt: new Date()
      }

      const draftId = await db.drafts.add(draft)
      expect(draftId).toBeDefined()

      const savedDrafts = await db.drafts.toArray()
      expect(savedDrafts).toHaveLength(1)
      expect(savedDrafts[0].total).toBe(25)

      // ===== TEST 7: Offline Functionality =====
      // Simulate offline mode
      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        value: false
      })

      // Create another transaction while offline
      const offlineCartItems = [
        {
          productId: 'prod-2',
          name: 'น้ำดื่ม',
          sellingPrice: 15,
          costPrice: 8,
          quantity: 1
        }
      ]

      const offlineTransactionResult = await transactionService.createTransaction({ items: offlineCartItems })
      expect(offlineTransactionResult.success).toBe(true)
      expect(offlineTransactionResult.transaction.synced).toBe(false)

      // ===== TEST 8: Sync Attempt =====
      // Simulate coming back online
      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        value: true
      })

      // Attempt sync (will be mocked)
      const syncResult = await syncService.performSync()
      
      // Verify sync was attempted (even if mocked)
      expect(mockSupabase.from).toHaveBeenCalled()

      console.log('✅ All integration tests completed successfully!')
      console.log('📊 Test Summary:')
      console.log('  - Search functionality: ✅')
      console.log('  - Transaction creation: ✅')
      console.log('  - Inventory management: ✅')
      console.log('  - Price isolation: ✅')
      console.log('  - Draft management: ✅')
      console.log('  - Offline functionality: ✅')
      console.log('  - Sync integration: ✅')
    })

    it('should validate property-based test coverage', async () => {
      // ===== Property 1: Cart Total Calculation =====
      const products: Product[] = [
        {
          id: 'prop-1',
          name: 'Test Product 1',
          description: 'For testing',
          costPrice: 10.50,
          sellingPrice: 20.75,
          quantity: 100,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date()
        },
        {
          id: 'prop-2',
          name: 'Test Product 2',
          description: 'For testing',
          costPrice: 5.25,
          sellingPrice: 12.50,
          quantity: 50,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ]

      await db.products.bulkPut(products)

      // Test multiple quantity combinations
      const testCases = [
        { quantities: [1, 1], expectedTotal: 33.25 }, // 20.75 + 12.50
        { quantities: [2, 3], expectedTotal: 79.00 }, // (20.75 * 2) + (12.50 * 3)
        { quantities: [0, 5], expectedTotal: 62.50 }, // (0) + (12.50 * 5)
      ]

      for (const testCase of testCases) {
        const cartItems = [
          {
            productId: 'prop-1',
            name: 'Test Product 1',
            sellingPrice: 20.75,
            costPrice: 10.50,
            quantity: testCase.quantities[0]
          },
          {
            productId: 'prop-2',
            name: 'Test Product 2',
            sellingPrice: 12.50,
            costPrice: 5.25,
            quantity: testCase.quantities[1]
          }
        ].filter(item => item.quantity > 0) // Remove zero quantity items

        if (cartItems.length > 0) {
          const result = await transactionService.createTransaction({ items: cartItems })
          expect(result.success).toBe(true)
          expect(result.transaction.total).toBe(testCase.expectedTotal)
        }
      }

      // ===== Property 2: Inventory Deduction =====
      // Verify inventory was properly deducted
      const finalProducts = await db.products.toArray()
      const product1 = finalProducts.find(p => p.id === 'prop-1')
      const product2 = finalProducts.find(p => p.id === 'prop-2')

      // Total deductions: 1 + 2 = 3 for product1, 1 + 3 + 5 = 9 for product2
      expect(product1?.quantity).toBe(97) // 100 - 3
      expect(product2?.quantity).toBe(41) // 50 - 9

      // ===== Property 3: Search Tokenization =====
      await productService.initializeSearch()
      
      // Test that search works with partial matches
      const searchResults1 = await searchEngine.search('Test')
      expect(searchResults1.length).toBe(2) // Should match both products

      const searchResults2 = await searchEngine.search('Product 1')
      expect(searchResults2.length).toBeGreaterThanOrEqual(1) // Should match at least product 1

      console.log('✅ Property-based test coverage validated!')
      console.log('📊 Properties tested:')
      console.log('  - Cart total calculation: ✅')
      console.log('  - Inventory deduction: ✅')
      console.log('  - Search tokenization: ✅')
    })

    it('should validate data consistency across operations', async () => {
      // ===== Setup initial data =====
      const product: Product = {
        id: 'consistency-test',
        name: 'Consistency Test Product',
        description: 'Testing data consistency',
        costPrice: 10,
        sellingPrice: 20,
        quantity: 100,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      }

      await db.products.put(product)

      // ===== Test 1: Multiple concurrent operations =====
      const operations = []
      
      // Create multiple transactions concurrently
      for (let i = 0; i < 5; i++) {
        const cartItems = [
          {
            productId: 'consistency-test',
            name: 'Consistency Test Product',
            sellingPrice: 20,
            costPrice: 10,
            quantity: 2
          }
        ]
        operations.push(transactionService.createTransaction({ items: cartItems }))
      }

      const results = await Promise.all(operations)
      
      // Verify all transactions succeeded
      expect(results.every(r => r.success)).toBe(true)
      
      // Verify inventory consistency
      const finalProduct = await db.products.get('consistency-test')
      expect(finalProduct?.quantity).toBe(90) // 100 - (5 * 2)

      // Verify transaction count
      const allTransactions = await db.transactions.toArray()
      expect(allTransactions.length).toBeGreaterThanOrEqual(5)

      // ===== Test 2: Data integrity after price changes =====
      const originalTransactionCount = allTransactions.length
      
      // Change product price
      await db.products.update('consistency-test', { sellingPrice: 30, costPrice: 15 })
      
      // Create new transaction with new prices
      const newCartItems = [
        {
          productId: 'consistency-test',
          name: 'Consistency Test Product',
          sellingPrice: 30, // New price
          costPrice: 15,    // New price
          quantity: 1
        }
      ]

      const newTransactionResult = await transactionService.createTransaction({ items: newCartItems })
      expect(newTransactionResult.success).toBe(true)
      expect(newTransactionResult.transaction.total).toBe(30) // New price

      // Verify old transactions still have old prices
      const oldTransactions = await db.transactions.toArray()
      const firstOldTransaction = oldTransactions.find(t => t.items[0].sellingPrice === 20)
      expect(firstOldTransaction).toBeDefined()
      expect(firstOldTransaction!.items[0].sellingPrice).toBe(20) // Old price preserved

      console.log('✅ Data consistency validated!')
      console.log('📊 Consistency checks:')
      console.log('  - Concurrent operations: ✅')
      console.log('  - Inventory integrity: ✅')
      console.log('  - Price isolation: ✅')
    })
  })
})