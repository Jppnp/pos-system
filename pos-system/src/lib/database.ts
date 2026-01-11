import Dexie, { type Table } from 'dexie';

export interface Product {
  id?: string;
  name: string;
  description: string;
  costPrice: number;
  sellingPrice: number;
  quantity: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface TransactionItem {
  productId: string;
  name: string;
  sellingPrice: number; // Snapshot at time of sale
  costPrice: number;    // Snapshot at time of sale
  quantity: number;
}

export interface Transaction {
  id?: string;
  items: TransactionItem[];
  total: number;
  totalCost: number;
  profit: number;
  timestamp: Date;
  synced: boolean;
}

export interface Draft {
  id?: string;
  items: TransactionItem[];
  total: number;
  createdAt: Date;
}

export interface SearchFrequency {
  productId: string;
  count: number;
}

export class PosDatabase extends Dexie {
  products!: Table<Product>;
  transactions!: Table<Transaction>;
  drafts!: Table<Draft>;
  searchFrequency!: Table<SearchFrequency>;

  constructor() {
    super('PosDatabase');
    
    // Version 1: Initial schema
    this.version(1).stores({
      products: '++id, name, description, isActive, createdAt, updatedAt, quantity',
      transactions: '++id, timestamp, synced',
      drafts: '++id, createdAt',
      searchFrequency: '++productId, count'
    });

    // Database initialization hooks
    this.products.hook('creating', function (_primKey, obj, _trans) {
      obj.createdAt = new Date();
      obj.updatedAt = new Date();
      obj.isActive = obj.isActive !== false; // Default to true
    });

    this.products.hook('updating', function (modifications, _primKey, _obj, _trans) {
      (modifications as any).updatedAt = new Date();
    });

    this.transactions.hook('creating', function (_primKey, obj, _trans) {
      obj.timestamp = obj.timestamp || new Date();
      obj.synced = false; // Always start as unsynced
    });

    this.drafts.hook('creating', function (_primKey, obj, _trans) {
      obj.createdAt = obj.createdAt || new Date();
    });
  }

  /**
   * Initialize database with default data if empty
   */
  async initializeDatabase(): Promise<void> {
    try {
      // Check if database is already initialized
      const productCount = await this.products.count();
      
      if (productCount === 0) {
        console.log('Initializing database with sample data...');
        
        // Add some sample products for development
        await this.products.bulkAdd([
          {
            name: 'Mama หมู',
            description: 'บะหมี่กึ่งสำเร็จรูป รสหมู',
            costPrice: 25,
            sellingPrice: 30,
            quantity: 50,
            isActive: true,
            createdAt: new Date(),
            updatedAt: new Date()
          },
          {
            name: 'น้ำดื่ม',
            description: 'น้ำดื่มบรรจุขวด 600ml',
            costPrice: 10,
            sellingPrice: 15,
            quantity: 100,
            isActive: true,
            createdAt: new Date(),
            updatedAt: new Date()
          },
          {
            name: 'ขนมปัง',
            description: 'ขนมปังแผ่น',
            costPrice: 20,
            sellingPrice: 25,
            quantity: 3, // Low stock for testing
            isActive: true,
            createdAt: new Date(),
            updatedAt: new Date()
          }
        ]);
        
        console.log('Database initialized successfully');
      }
    } catch (error) {
      console.error('Failed to initialize database:', error);
      throw error;
    }
  }

  /**
   * Clear all data (for logout)
   */
  async clearAllData(): Promise<void> {
    try {
      await this.transaction('rw', this.products, this.transactions, this.drafts, this.searchFrequency, async () => {
        await this.products.clear();
        await this.transactions.clear();
        await this.drafts.clear();
        await this.searchFrequency.clear();
      });
      console.log('All local data cleared');
    } catch (error) {
      console.error('Failed to clear data:', error);
      throw error;
    }
  }

  /**
   * Get unsynced transactions for cloud sync
   */
  async getUnsyncedTransactions(): Promise<Transaction[]> {
    return await this.transactions.where('synced').equals(0).toArray();
  }

  /**
   * Mark transactions as synced
   */
  async markTransactionsSynced(transactionIds: string[]): Promise<void> {
    await this.transactions.where('id').anyOf(transactionIds).modify({ synced: true });
  }

  /**
   * Bulk put products (for sync operations)
   */
  async bulkPutProducts(products: Product[]): Promise<void> {
    await this.products.bulkPut(products);
  }

  /**
   * Bulk put transactions (for sync operations)
   */
  async bulkPutTransactions(transactions: Transaction[]): Promise<void> {
    await this.transactions.bulkPut(transactions);
  }
}

export const db = new PosDatabase();