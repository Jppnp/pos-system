import { db, type Product } from '../lib/database';
import { searchEngine, type SearchResult } from './SearchEngine';

export interface CreateProductData {
  name: string;
  description: string;
  costPrice: number;
  sellingPrice: number;
  quantity: number;
}

export interface UpdateProductData {
  name?: string;
  description?: string;
  costPrice?: number;
  sellingPrice?: number;
  quantity?: number;
  isActive?: boolean;
}

export class ProductService {
  /**
   * Create a new product
   */
  async createProduct(productData: CreateProductData): Promise<Product> {
    try {
      const product: Omit<Product, 'id'> = {
        ...productData,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const id = await db.products.add(product);
      const createdProduct = await db.products.get(id);
      
      if (!createdProduct) {
        throw new Error('Failed to retrieve created product');
      }

      // Refresh search engine
      await this.refreshSearch();

      return createdProduct;
    } catch (error) {
      console.error('Failed to create product:', error);
      throw error;
    }
  }

  /**
   * Get all active products
   */
  async getAllProducts(): Promise<Product[]> {
    try {
      return await db.products.filter(product => product.isActive === true).toArray();
    } catch (error) {
      console.error('Failed to get products:', error);
      throw error;
    }
  }

  /**
   * Get product by ID
   */
  async getProductById(id: string): Promise<Product | undefined> {
    try {
      return await db.products.get(id);
    } catch (error) {
      console.error('Failed to get product by ID:', error);
      throw error;
    }
  }

  /**
   * Update product
   */
  async updateProduct(id: string, updates: UpdateProductData): Promise<Product> {
    try {
      const updateData = {
        ...updates,
        updatedAt: new Date()
      };

      await db.products.update(id, updateData);
      const updatedProduct = await db.products.get(id);
      
      if (!updatedProduct) {
        throw new Error('Product not found after update');
      }

      // Refresh search engine
      await this.refreshSearch();

      return updatedProduct;
    } catch (error) {
      console.error('Failed to update product:', error);
      throw error;
    }
  }

  /**
   * Soft delete product (mark as inactive)
   */
  async deleteProduct(id: string): Promise<void> {
    try {
      await db.products.update(id, { 
        isActive: false, 
        updatedAt: new Date() 
      });
      
      // Refresh search engine
      await this.refreshSearch();
    } catch (error) {
      console.error('Failed to delete product:', error);
      throw error;
    }
  }

  /**
   * Hard delete product (permanently remove)
   */
  async permanentlyDeleteProduct(id: string): Promise<void> {
    try {
      await db.products.delete(id);
    } catch (error) {
      console.error('Failed to permanently delete product:', error);
      throw error;
    }
  }

  /**
   * Get products with low stock (quantity < 5)
   */
  async getLowStockProducts(): Promise<Product[]> {
    try {
      return await db.products
        .filter(product => product.isActive === true && product.quantity < 5)
        .toArray();
    } catch (error) {
      console.error('Failed to get low stock products:', error);
      throw error;
    }
  }

  /**
   * Check if product has low stock
   */
  isLowStock(product: Product): boolean {
    return product.quantity < 5;
  }

  /**
   * Update product quantity (for inventory management)
   */
  async updateQuantity(id: string, newQuantity: number): Promise<Product> {
    try {
      if (newQuantity < 0) {
        throw new Error('Quantity cannot be negative');
      }

      return await this.updateProduct(id, { quantity: newQuantity });
    } catch (error) {
      console.error('Failed to update product quantity:', error);
      throw error;
    }
  }

  /**
   * Deduct quantity from product (for sales)
   */
  async deductQuantity(id: string, quantityToDeduct: number): Promise<Product> {
    try {
      if (quantityToDeduct <= 0) {
        throw new Error('Quantity to deduct must be positive');
      }

      const product = await this.getProductById(id);
      if (!product) {
        throw new Error('Product not found');
      }

      const newQuantity = product.quantity - quantityToDeduct;
      if (newQuantity < 0) {
        throw new Error('Insufficient stock');
      }

      return await this.updateQuantity(id, newQuantity);
    } catch (error) {
      console.error('Failed to deduct product quantity:', error);
      throw error;
    }
  }

  /**
   * Search products using the advanced search engine
   */
  async searchProducts(query: string): Promise<Product[]> {
    try {
      const results = await searchEngine.search(query);
      return results.map(result => result.product);
    } catch (error) {
      console.error('Failed to search products:', error);
      // Fallback to basic search
      return this.basicSearchProducts(query);
    }
  }

  /**
   * Advanced search with detailed results including highlighting and scoring
   */
  async searchProductsAdvanced(query: string): Promise<SearchResult[]> {
    try {
      return await searchEngine.search(query);
    } catch (error) {
      console.error('Failed to perform advanced search:', error);
      throw error;
    }
  }

  /**
   * Basic search products by name or description (fallback method)
   */
  private async basicSearchProducts(query: string): Promise<Product[]> {
    try {
      if (!query.trim()) {
        return await this.getAllProducts();
      }

      const searchTerms = query.toLowerCase().trim().split(/\s+/);
      
      return await db.products
        .filter(product => {
          if (!product.isActive) return false;
          const searchText = `${product.name} ${product.description}`.toLowerCase();
          return searchTerms.every(term => searchText.includes(term));
        })
        .toArray();
    } catch (error) {
      console.error('Failed to search products:', error);
      throw error;
    }
  }

  /**
   * Record product access for search frequency tracking
   */
  async recordProductAccess(productId: string): Promise<void> {
    try {
      await searchEngine.recordProductAccess(productId);
    } catch (error) {
      console.error('Failed to record product access:', error);
    }
  }

  /**
   * Initialize search engine with current products
   */
  async initializeSearch(): Promise<void> {
    try {
      await searchEngine.initialize();
    } catch (error) {
      console.error('Failed to initialize search engine:', error);
      throw error;
    }
  }

  /**
   * Refresh search engine after product changes
   */
  async refreshSearch(): Promise<void> {
    try {
      await searchEngine.refreshProducts();
    } catch (error) {
      console.error('Failed to refresh search engine:', error);
    }
  }
  async getProductsCount(): Promise<number> {
    try {
      return await db.products.filter(product => product.isActive === true).count();
    } catch (error) {
      console.error('Failed to get products count:', error);
      throw error;
    }
  }

  /**
   * Bulk update products (for sync operations)
   */
  async bulkUpdateProducts(products: Product[]): Promise<void> {
    try {
      await db.transaction('rw', db.products, async () => {
        for (const product of products) {
          if (product.id) {
            await db.products.put(product);
          }
        }
      });
      
      // Refresh search engine after bulk update
      await this.refreshSearch();
    } catch (error) {
      console.error('Failed to bulk update products:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const productService = new ProductService();