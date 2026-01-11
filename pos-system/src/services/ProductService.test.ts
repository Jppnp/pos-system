import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { ProductService } from './ProductService';
import { db } from '../lib/database';

describe('ProductService', () => {
  let productService: ProductService;

  beforeEach(async () => {
    productService = new ProductService();
    // Clear database before each test
    await db.products.clear();
  });

  afterEach(async () => {
    // Clean up after each test
    await db.products.clear();
  });

  describe('createProduct', () => {
    it('should create a new product with all required fields', async () => {
      const productData = {
        name: 'Test Product',
        description: 'Test Description',
        costPrice: 10,
        sellingPrice: 15,
        quantity: 100
      };

      const product = await productService.createProduct(productData);

      expect(product).toBeDefined();
      expect(product.id).toBeDefined();
      expect(product.name).toBe(productData.name);
      expect(product.description).toBe(productData.description);
      expect(product.costPrice).toBe(productData.costPrice);
      expect(product.sellingPrice).toBe(productData.sellingPrice);
      expect(product.quantity).toBe(productData.quantity);
      expect(product.isActive).toBe(true);
      expect(product.createdAt).toBeInstanceOf(Date);
      expect(product.updatedAt).toBeInstanceOf(Date);
    });
  });

  describe('getAllProducts', () => {
    it('should return only active products', async () => {
      // Create active product
      await productService.createProduct({
        name: 'Active Product',
        description: 'Active',
        costPrice: 10,
        sellingPrice: 15,
        quantity: 100
      });

      // Create inactive product
      const inactiveProduct = await productService.createProduct({
        name: 'Inactive Product',
        description: 'Inactive',
        costPrice: 10,
        sellingPrice: 15,
        quantity: 100
      });

      // Mark as inactive
      await productService.deleteProduct(inactiveProduct.id!);

      const products = await productService.getAllProducts();
      expect(products).toHaveLength(1);
      expect(products[0].name).toBe('Active Product');
    });
  });

  describe('updateProduct', () => {
    it('should update product fields and updatedAt timestamp', async () => {
      const product = await productService.createProduct({
        name: 'Original Name',
        description: 'Original Description',
        costPrice: 10,
        sellingPrice: 15,
        quantity: 100
      });

      const originalUpdatedAt = product.updatedAt;
      
      // Wait a bit to ensure timestamp difference
      await new Promise(resolve => setTimeout(resolve, 10));

      const updatedProduct = await productService.updateProduct(product.id!, {
        name: 'Updated Name',
        sellingPrice: 20
      });

      expect(updatedProduct.name).toBe('Updated Name');
      expect(updatedProduct.sellingPrice).toBe(20);
      expect(updatedProduct.description).toBe('Original Description'); // Unchanged
      expect(updatedProduct.updatedAt.getTime()).toBeGreaterThan(originalUpdatedAt.getTime());
    });
  });

  describe('getLowStockProducts', () => {
    it('should return products with quantity less than 5', async () => {
      // Create products with different quantities
      await productService.createProduct({
        name: 'High Stock',
        description: 'High',
        costPrice: 10,
        sellingPrice: 15,
        quantity: 10
      });

      await productService.createProduct({
        name: 'Low Stock 1',
        description: 'Low',
        costPrice: 10,
        sellingPrice: 15,
        quantity: 3
      });

      await productService.createProduct({
        name: 'Low Stock 2',
        description: 'Low',
        costPrice: 10,
        sellingPrice: 15,
        quantity: 1
      });

      const lowStockProducts = await productService.getLowStockProducts();
      expect(lowStockProducts).toHaveLength(2);
      expect(lowStockProducts.every(p => p.quantity < 5)).toBe(true);
    });
  });

  describe('isLowStock', () => {
    it('should return true for products with quantity less than 5', () => {
      const lowStockProduct = {
        id: '1',
        name: 'Low Stock',
        description: 'Low',
        costPrice: 10,
        sellingPrice: 15,
        quantity: 3,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const highStockProduct = {
        ...lowStockProduct,
        quantity: 10
      };

      expect(productService.isLowStock(lowStockProduct)).toBe(true);
      expect(productService.isLowStock(highStockProduct)).toBe(false);
    });
  });

  describe('deductQuantity', () => {
    it('should deduct quantity from product', async () => {
      const product = await productService.createProduct({
        name: 'Test Product',
        description: 'Test',
        costPrice: 10,
        sellingPrice: 15,
        quantity: 10
      });

      const updatedProduct = await productService.deductQuantity(product.id!, 3);
      expect(updatedProduct.quantity).toBe(7);
    });

    it('should throw error when trying to deduct more than available', async () => {
      const product = await productService.createProduct({
        name: 'Test Product',
        description: 'Test',
        costPrice: 10,
        sellingPrice: 15,
        quantity: 5
      });

      await expect(productService.deductQuantity(product.id!, 10))
        .rejects.toThrow('Insufficient stock');
    });
  });

  describe('searchProducts', () => {
    beforeEach(async () => {
      // Create test products
      await productService.createProduct({
        name: 'Mama หมู',
        description: 'บะหมี่กึ่งสำเร็จรูป รสหมู',
        costPrice: 25,
        sellingPrice: 30,
        quantity: 50
      });

      await productService.createProduct({
        name: 'น้ำดื่ม',
        description: 'น้ำดื่มบรรจุขวด 600ml',
        costPrice: 10,
        sellingPrice: 15,
        quantity: 100
      });
    });

    it('should find products by name', async () => {
      const results = await productService.searchProducts('Mama');
      expect(results).toHaveLength(1);
      expect(results[0].name).toBe('Mama หมู');
    });

    it('should find products by description', async () => {
      const results = await productService.searchProducts('บะหมี่');
      expect(results).toHaveLength(1);
      expect(results[0].name).toBe('Mama หมู');
    });

    it('should find products with multiple search terms', async () => {
      const results = await productService.searchProducts('น้ำ ขวด');
      expect(results).toHaveLength(1);
      expect(results[0].name).toBe('น้ำดื่ม');
    });

    it('should return all products for empty query', async () => {
      const results = await productService.searchProducts('');
      expect(results).toHaveLength(2);
    });
  });
});