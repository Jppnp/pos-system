import { supabase, type Database } from '../lib/supabase'
import { db, type Product, type Transaction } from '../lib/database'
import { productService } from './ProductService'

export interface SyncStatus {
  isOnline: boolean
  lastSyncTime: Date | null
  pendingTransactions: number
  pendingProducts: number
  syncInProgress: boolean
}

export interface SyncResult {
  success: boolean
  error?: string
  syncedTransactions: number
  syncedProducts: number
  pulledTransactions: number
  pulledProducts: number
}

export class SyncService {
  private syncInterval: number | null = null
  private readonly SYNC_INTERVAL_MS = 5 * 60 * 1000 // 5 minutes
  private syncInProgress = false
  private onlineStatusListeners: ((isOnline: boolean) => void)[] = []

  constructor() {
    this.setupOnlineStatusDetection()
  }

  /**
   * Setup online status detection (Requirement 6.3)
   */
  private setupOnlineStatusDetection(): void {
    // Initial status
    this.notifyOnlineStatusChange(navigator.onLine)

    // Listen for online/offline events
    window.addEventListener('online', () => {
      console.log('Network connection restored')
      this.notifyOnlineStatusChange(true)
      // Trigger immediate sync when coming back online
      this.performSync()
    })

    window.addEventListener('offline', () => {
      console.log('Network connection lost')
      this.notifyOnlineStatusChange(false)
    })
  }

  /**
   * Notify listeners about online status changes
   */
  private notifyOnlineStatusChange(isOnline: boolean): void {
    this.onlineStatusListeners.forEach(listener => listener(isOnline))
  }

  /**
   * Subscribe to online status changes
   */
  onOnlineStatusChange(callback: (isOnline: boolean) => void): () => void {
    this.onlineStatusListeners.push(callback)
    
    // Return unsubscribe function
    return () => {
      const index = this.onlineStatusListeners.indexOf(callback)
      if (index > -1) {
        this.onlineStatusListeners.splice(index, 1)
      }
    }
  }

  /**
   * Check if device is online
   */
  isOnline(): boolean {
    return navigator.onLine
  }

  /**
   * Start periodic sync (Requirement 6.4)
   */
  startPeriodicSync(): void {
    if (this.syncInterval) {
      this.stopPeriodicSync()
    }

    console.log('Starting periodic sync every 5 minutes')
    this.syncInterval = window.setInterval(() => {
      if (this.isOnline()) {
        this.performSync()
      }
    }, this.SYNC_INTERVAL_MS)

    // Perform initial sync if online
    if (this.isOnline()) {
      this.performSync()
    }
  }

  /**
   * Stop periodic sync
   */
  stopPeriodicSync(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval)
      this.syncInterval = null
      console.log('Periodic sync stopped')
    }
  }

  /**
   * Get current sync status
   */
  async getSyncStatus(): Promise<SyncStatus> {
    try {
      const unsyncedTransactions = await db.getUnsyncedTransactions()
      const lastSyncTime = this.getLastSyncTime()

      return {
        isOnline: this.isOnline(),
        lastSyncTime,
        pendingTransactions: unsyncedTransactions.length,
        pendingProducts: 0, // Products sync immediately, no pending state
        syncInProgress: this.syncInProgress
      }
    } catch (error) {
      console.error('Failed to get sync status:', error)
      return {
        isOnline: this.isOnline(),
        lastSyncTime: null,
        pendingTransactions: 0,
        pendingProducts: 0,
        syncInProgress: false
      }
    }
  }

  /**
   * Perform full synchronization (Requirement 6.4, 6.5, 6.6)
   */
  async performSync(): Promise<SyncResult> {
    if (!this.isOnline()) {
      return {
        success: false,
        error: 'Device is offline',
        syncedTransactions: 0,
        syncedProducts: 0,
        pulledTransactions: 0,
        pulledProducts: 0
      }
    }

    if (this.syncInProgress) {
      console.log('Sync already in progress, skipping')
      return {
        success: false,
        error: 'Sync already in progress',
        syncedTransactions: 0,
        syncedProducts: 0,
        pulledTransactions: 0,
        pulledProducts: 0
      }
    }

    this.syncInProgress = true
    console.log('Starting sync operation...')

    try {
      // Check if user is authenticated
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        throw new Error('User not authenticated')
      }

      let syncedTransactions = 0
      let syncedProducts = 0
      let pulledTransactions = 0
      let pulledProducts = 0

      // Step 1: Push unsynced transactions to cloud (Requirement 6.5)
      const unsyncedTransactions = await db.getUnsyncedTransactions()
      if (unsyncedTransactions.length > 0) {
        syncedTransactions = await this.pushTransactionsToCloud(unsyncedTransactions, user.id)
      }

      // Step 2: Check if local database is empty and pull data if needed (Requirement 6.7)
      const localProductCount = await productService.getProductsCount()
      if (localProductCount === 0) {
        console.log('Local database is empty, pulling complete dataset from cloud')
        const pullResult = await this.pullCompleteDataset(user.id)
        pulledProducts = pullResult.products
        pulledTransactions = pullResult.transactions
      }

      // Step 3: Bidirectional sync for products (conflict resolution)
      syncedProducts = await this.syncProducts(user.id)

      this.setLastSyncTime(new Date())

      const result: SyncResult = {
        success: true,
        syncedTransactions,
        syncedProducts,
        pulledTransactions,
        pulledProducts
      }

      console.log('Sync completed successfully:', result)
      return result

    } catch (error) {
      console.error('Sync failed:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown sync error',
        syncedTransactions: 0,
        syncedProducts: 0,
        pulledTransactions: 0,
        pulledProducts: 0
      }
    } finally {
      this.syncInProgress = false
    }
  }

  /**
   * Push unsynced transactions to cloud (Requirement 6.5)
   */
  private async pushTransactionsToCloud(transactions: Transaction[], userId: string): Promise<number> {
    try {
      console.log(`Pushing ${transactions.length} transactions to cloud`)

      const cloudTransactions = transactions.map(transaction => ({
        id: transaction.id,
        user_id: userId,
        items: transaction.items,
        total: transaction.total,
        total_cost: transaction.totalCost,
        profit: transaction.profit,
        timestamp: transaction.timestamp.toISOString()
      }))

      const { error } = await supabase
        .from('transactions')
        .upsert(cloudTransactions, { onConflict: 'id' })

      if (error) {
        throw error
      }

      // Mark transactions as synced (Requirement 6.6)
      const transactionIds = transactions.map(t => t.id!).filter(Boolean)
      await db.markTransactionsSynced(transactionIds)

      console.log(`Successfully synced ${transactions.length} transactions`)
      return transactions.length

    } catch (error) {
      console.error('Failed to push transactions to cloud:', error)
      throw error
    }
  }

  /**
   * Pull complete dataset from cloud for empty local database (Requirement 6.7)
   */
  private async pullCompleteDataset(userId: string): Promise<{ products: number; transactions: number }> {
    try {
      let pulledProducts = 0
      let pulledTransactions = 0

      // Pull products
      const { data: cloudProducts, error: productsError } = await supabase
        .from('products')
        .select('*')
        .eq('user_id', userId)
        .eq('is_active', true)

      if (productsError) {
        throw productsError
      }

      if (cloudProducts && cloudProducts.length > 0) {
        const localProducts: Product[] = cloudProducts.map(cp => ({
          id: cp.id,
          name: cp.name,
          description: cp.description || '',
          costPrice: cp.cost_price,
          sellingPrice: cp.selling_price,
          quantity: cp.quantity,
          isActive: cp.is_active,
          createdAt: new Date(cp.created_at),
          updatedAt: new Date(cp.updated_at)
        }))

        await db.bulkPutProducts(localProducts)
        pulledProducts = localProducts.length
        console.log(`Pulled ${pulledProducts} products from cloud`)

        // Refresh search engine after pulling products
        await productService.refreshSearch()
      }

      // Pull transactions
      const { data: cloudTransactions, error: transactionsError } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', userId)
        .order('timestamp', { ascending: false })

      if (transactionsError) {
        throw transactionsError
      }

      if (cloudTransactions && cloudTransactions.length > 0) {
        const localTransactions: Transaction[] = cloudTransactions.map(ct => ({
          id: ct.id,
          items: ct.items,
          total: ct.total,
          totalCost: ct.total_cost,
          profit: ct.profit,
          timestamp: new Date(ct.timestamp),
          synced: true // Mark as synced since they came from cloud
        }))

        await db.bulkPutTransactions(localTransactions)
        pulledTransactions = localTransactions.length
        console.log(`Pulled ${pulledTransactions} transactions from cloud`)
      }

      return { products: pulledProducts, transactions: pulledTransactions }

    } catch (error) {
      console.error('Failed to pull complete dataset:', error)
      throw error
    }
  }

  /**
   * Bidirectional sync for products with conflict resolution
   */
  private async syncProducts(userId: string): Promise<number> {
    try {
      // For now, implement simple last-write-wins conflict resolution
      // In a more sophisticated system, we could implement more complex strategies

      // Get local products that have been modified
      const localProducts = await productService.getAllProducts()
      
      // Get cloud products
      const { data: cloudProducts, error } = await supabase
        .from('products')
        .select('*')
        .eq('user_id', userId)

      if (error) {
        throw error
      }

      let syncedCount = 0

      // Simple conflict resolution: compare updatedAt timestamps
      // This is a basic implementation - in production, you might want more sophisticated conflict resolution
      for (const localProduct of localProducts) {
        const cloudProduct = cloudProducts?.find(cp => cp.id === localProduct.id)
        
        if (!cloudProduct) {
          // Local product doesn't exist in cloud, push it
          await this.pushProductToCloud(localProduct, userId)
          syncedCount++
        } else {
          // Compare timestamps for conflict resolution
          const localUpdated = new Date(localProduct.updatedAt).getTime()
          const cloudUpdated = new Date(cloudProduct.updated_at).getTime()
          
          if (localUpdated > cloudUpdated) {
            // Local is newer, push to cloud
            await this.pushProductToCloud(localProduct, userId)
            syncedCount++
          } else if (cloudUpdated > localUpdated) {
            // Cloud is newer, pull to local
            await this.pullProductFromCloud(cloudProduct)
            syncedCount++
          }
          // If timestamps are equal, no sync needed
        }
      }

      // Check for cloud products that don't exist locally
      if (cloudProducts) {
        for (const cloudProduct of cloudProducts) {
          const localExists = localProducts.some(lp => lp.id === cloudProduct.id)
          if (!localExists) {
            await this.pullProductFromCloud(cloudProduct)
            syncedCount++
          }
        }
      }

      if (syncedCount > 0) {
        await productService.refreshSearch()
      }

      return syncedCount

    } catch (error) {
      console.error('Failed to sync products:', error)
      throw error
    }
  }

  /**
   * Push a single product to cloud
   */
  private async pushProductToCloud(product: Product, userId: string): Promise<void> {
    const cloudProduct = {
      id: product.id,
      user_id: userId,
      name: product.name,
      description: product.description,
      cost_price: product.costPrice,
      selling_price: product.sellingPrice,
      quantity: product.quantity,
      is_active: product.isActive,
      created_at: product.createdAt.toISOString(),
      updated_at: product.updatedAt.toISOString()
    }

    const { error } = await supabase
      .from('products')
      .upsert(cloudProduct, { onConflict: 'id' })

    if (error) {
      throw error
    }
  }

  /**
   * Pull a single product from cloud
   */
  private async pullProductFromCloud(cloudProduct: Database['public']['Tables']['products']['Row']): Promise<void> {
    const localProduct: Product = {
      id: cloudProduct.id,
      name: cloudProduct.name,
      description: cloudProduct.description || '',
      costPrice: cloudProduct.cost_price,
      sellingPrice: cloudProduct.selling_price,
      quantity: cloudProduct.quantity,
      isActive: cloudProduct.is_active,
      createdAt: new Date(cloudProduct.created_at),
      updatedAt: new Date(cloudProduct.updated_at)
    }

    await db.products.put(localProduct)
  }

  /**
   * Force immediate sync
   */
  async forcSync(): Promise<SyncResult> {
    return await this.performSync()
  }

  /**
   * Get last sync time from localStorage
   */
  private getLastSyncTime(): Date | null {
    const lastSync = localStorage.getItem('lastSyncTime')
    return lastSync ? new Date(lastSync) : null
  }

  /**
   * Set last sync time in localStorage
   */
  private setLastSyncTime(time: Date): void {
    localStorage.setItem('lastSyncTime', time.toISOString())
  }

  /**
   * Clear sync data (called on logout)
   */
  clearSyncData(): void {
    this.stopPeriodicSync()
    localStorage.removeItem('lastSyncTime')
    this.syncInProgress = false
  }
}

// Export singleton instance
export const syncService = new SyncService()