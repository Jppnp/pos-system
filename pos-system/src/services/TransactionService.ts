import { db, type Transaction, type TransactionItem } from '../lib/database'
import type { CartItem } from '../types/cart'
import { receiptService } from './ReceiptService'

export interface CreateTransactionRequest {
  items: CartItem[]
}

export interface TransactionResult {
  transaction: Transaction
  success: boolean
  error?: string
}

export class TransactionService {
  /**
   * Create a new transaction with price snapshotting and inventory deduction
   */
  async createTransaction(request: CreateTransactionRequest): Promise<TransactionResult> {
    if (!request.items || request.items.length === 0) {
      return {
        transaction: {} as Transaction,
        success: false,
        error: 'Cannot create transaction with empty cart'
      }
    }

    try {
      // Use database transaction to ensure atomicity
      const result = await db.transaction('rw', db.products, db.transactions, async () => {
        // Step 1: Validate inventory availability and get current product data
        const productUpdates: { id: string; newQuantity: number }[] = []
        const transactionItems: TransactionItem[] = []
        
        for (const cartItem of request.items) {
          const product = await db.products.get(cartItem.productId)
          
          if (!product) {
            throw new Error(`Product not found: ${cartItem.productId}`)
          }
          
          if (product.quantity < cartItem.quantity) {
            throw new Error(`Insufficient inventory for ${product.name}. Available: ${product.quantity}, Requested: ${cartItem.quantity}`)
          }
          
          // Prepare inventory update
          const newQuantity = product.quantity - cartItem.quantity
          productUpdates.push({
            id: cartItem.productId,
            newQuantity
          })
          
          // Create transaction item with price snapshot
          const transactionItem: TransactionItem = {
            productId: cartItem.productId,
            name: cartItem.name,
            sellingPrice: cartItem.sellingPrice, // Snapshot current selling price
            costPrice: cartItem.costPrice,       // Snapshot current cost price
            quantity: cartItem.quantity
          }
          
          transactionItems.push(transactionItem)
        }
        
        // Step 2: Calculate totals
        const total = transactionItems.reduce(
          (sum, item) => sum + (item.sellingPrice * item.quantity), 
          0
        )
        
        const totalCost = transactionItems.reduce(
          (sum, item) => sum + (item.costPrice * item.quantity), 
          0
        )
        
        const profit = total - totalCost
        
        // Step 3: Create transaction record
        const transaction: Transaction = {
          items: transactionItems,
          total,
          totalCost,
          profit,
          timestamp: new Date(),
          synced: false // Always start as unsynced
        }
        
        // Step 4: Save transaction to database
        const transactionId = await db.transactions.add(transaction)
        
        // Step 5: Update inventory quantities
        for (const update of productUpdates) {
          await db.products.update(update.id, { 
            quantity: update.newQuantity,
            updatedAt: new Date()
          })
        }
        
        // Return the created transaction with ID
        const transactionWithId = {
          ...transaction,
          id: transactionId.toString()
        }
        
        // Generate receipt automatically after successful transaction
        receiptService.generateReceipt(transactionWithId)
        
        return transactionWithId
      })
      
      return {
        transaction: result,
        success: true
      }
      
    } catch (error) {
      console.error('Failed to create transaction:', error)
      return {
        transaction: {} as Transaction,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      }
    }
  }
  
  /**
   * Get all transactions sorted by date (newest first)
   */
  async getTransactions(): Promise<Transaction[]> {
    try {
      return await db.transactions.orderBy('timestamp').reverse().toArray()
    } catch (error) {
      console.error('Failed to get transactions:', error)
      return []
    }
  }
  
  /**
   * Get transactions within a date range
   */
  async getTransactionsByDateRange(startDate: Date, endDate: Date): Promise<Transaction[]> {
    try {
      return await db.transactions
        .where('timestamp')
        .between(startDate, endDate, true, true)
        .reverse()
        .sortBy('timestamp')
    } catch (error) {
      console.error('Failed to get transactions by date range:', error)
      return []
    }
  }
  
  /**
   * Get transactions containing specific products
   */
  async getTransactionsByProducts(productIds: string[]): Promise<Transaction[]> {
    try {
      const allTransactions = await this.getTransactions()
      
      return allTransactions.filter(transaction =>
        transaction.items.some(item => productIds.includes(item.productId))
      )
    } catch (error) {
      console.error('Failed to get transactions by products:', error)
      return []
    }
  }
  
  /**
   * Get unsynced transactions for cloud synchronization
   */
  async getUnsyncedTransactions(): Promise<Transaction[]> {
    try {
      return await db.transactions.where('synced').equals(0).toArray()
    } catch (error) {
      console.error('Failed to get unsynced transactions:', error)
      return []
    }
  }
  
  /**
   * Mark transactions as synced
   */
  async markTransactionsSynced(transactionIds: string[]): Promise<void> {
    try {
      await db.transactions.where('id').anyOf(transactionIds).modify({ synced: true })
    } catch (error) {
      console.error('Failed to mark transactions as synced:', error)
      throw error
    }
  }
  
  /**
   * Calculate sales totals for a set of transactions
   */
  calculateSalesTotals(transactions: Transaction[]): {
    totalSales: number
    totalCost: number
    totalProfit: number
    transactionCount: number
  } {
    const totals = transactions.reduce(
      (acc, transaction) => ({
        totalSales: acc.totalSales + transaction.total,
        totalCost: acc.totalCost + transaction.totalCost,
        totalProfit: acc.totalProfit + transaction.profit,
        transactionCount: acc.transactionCount + 1
      }),
      {
        totalSales: 0,
        totalCost: 0,
        totalProfit: 0,
        transactionCount: 0
      }
    )
    
    return totals
  }
}

// Export singleton instance
export const transactionService = new TransactionService()