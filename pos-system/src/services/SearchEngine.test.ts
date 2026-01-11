import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { SearchEngine } from './SearchEngine';
import { db } from '../lib/database';

describe('SearchEngine', () => {
  let searchEngine: SearchEngine;

  beforeEach(async () => {
    searchEngine = new SearchEngine();
    
    // Clear database and add test products
    await db.products.clear();
    await db.searchFrequency.clear();
    
    await db.products.bulkAdd([
      {
        id: '1',
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
        id: '2',
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
        id: '3',
        name: 'ขนมปัง',
        description: 'ขนมปังแผ่น',
        costPrice: 20,
        sellingPrice: 25,
        quantity: 3,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ]);
  });

  afterEach(async () => {
    await db.products.clear();
    await db.searchFrequency.clear();
  });

  describe('basic search functionality', () => {
    it('should find products by exact name match', async () => {
      const results = await searchEngine.search('Mama');
      
      expect(results).toHaveLength(1);
      expect(results[0].product.name).toBe('Mama หมู');
      expect(results[0].score).toBeGreaterThan(0);
      expect(results[0].matchedFields).toContain('name');
    });

    it('should find products by description', async () => {
      const results = await searchEngine.search('บะหมี่');
      
      expect(results).toHaveLength(1);
      expect(results[0].product.name).toBe('Mama หมู');
      expect(results[0].matchedFields).toContain('description');
    });

    it('should tokenize and match multiple terms', async () => {
      const results = await searchEngine.search('น้ำ ขวด');
      
      expect(results).toHaveLength(1);
      expect(results[0].product.name).toBe('น้ำดื่ม');
    });

    it('should return empty results for non-matching query', async () => {
      const results = await searchEngine.search('nonexistent');
      
      expect(results).toHaveLength(0);
    });

    it('should return all products for empty query', async () => {
      const results = await searchEngine.search('');
      
      expect(results).toHaveLength(3);
    });
  });

  describe('fuzzy matching', () => {
    it('should find products with misspelled names', async () => {
      const results = await searchEngine.search('Mamma'); // Misspelled "Mama"
      
      expect(results.length).toBeGreaterThan(0);
      // Should find Mama หมู with fuzzy matching
      const mamaResult = results.find(r => r.product.name === 'Mama หมู');
      expect(mamaResult).toBeDefined();
    });
  });

  describe('highlighting', () => {
    it('should highlight matched text in results', async () => {
      const results = await searchEngine.search('Mama');
      
      expect(results).toHaveLength(1);
      expect(results[0].highlightedName).toContain('<mark>');
      expect(results[0].highlightedName).toContain('</mark>');
    });
  });

  describe('frequency tracking', () => {
    it('should record product access', async () => {
      await searchEngine.recordProductAccess('1');
      await searchEngine.recordProductAccess('1');
      
      // Search should now boost frequently accessed products
      const results = await searchEngine.search('');
      
      // Product with ID '1' should have higher score due to frequency
      const product1 = results.find(r => r.product.id === '1');
      const product2 = results.find(r => r.product.id === '2');
      
      expect(product1?.score).toBeGreaterThan(product2?.score || 0);
    });
  });

  describe('search options', () => {
    it('should limit results based on maxResults option', async () => {
      const results = await searchEngine.search('', { maxResults: 2 });
      
      expect(results).toHaveLength(2);
    });

    it('should include inactive products when specified', async () => {
      // Mark one product as inactive
      await db.products.update('1', { isActive: false });
      
      const activeResults = await searchEngine.search('', { includeInactive: false });
      const allResults = await searchEngine.search('', { includeInactive: true });
      
      expect(activeResults.length).toBeLessThan(allResults.length);
    });
  });
});