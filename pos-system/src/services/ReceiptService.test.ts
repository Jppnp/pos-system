import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ReceiptService } from './ReceiptService'
import type { Transaction } from '../lib/database'

describe('ReceiptService', () => {
  let receiptService: ReceiptService
  let mockTransaction: Transaction

  beforeEach(() => {
    receiptService = new ReceiptService()
    
    // Mock transaction data
    mockTransaction = {
      id: '1',
      items: [
        {
          productId: '1',
          name: 'Mama หมู',
          sellingPrice: 30,
          costPrice: 25,
          quantity: 2
        },
        {
          productId: '2',
          name: 'น้ำดื่ม',
          sellingPrice: 15,
          costPrice: 10,
          quantity: 1
        }
      ],
      total: 75,
      totalCost: 60,
      profit: 15,
      timestamp: new Date('2024-01-15T14:30:25.000Z'),
      synced: false
    }
  })

  describe('formatReceipt', () => {
    it('should format receipt with Thai template', () => {
      const receipt = receiptService.formatReceipt(mockTransaction)
      
      expect(receipt).toContain('ร้านค้าของเรา')
      expect(receipt).toContain('วันที่: 15/01/2567') // Buddhist Era year
      expect(receipt).toContain('เวลา: 21:30:25') // UTC+7 timezone
      expect(receipt).toContain('รายการสินค้า:')
      expect(receipt).toContain('Mama หมู')
      expect(receipt).toContain('น้ำดื่ม')
      expect(receipt).toContain('รวมทั้งสิ้น: ฿75.00')
      expect(receipt).toContain('ขอบคุณที่ใช้บริการ')
    })

    it('should include all transaction items', () => {
      const receipt = receiptService.formatReceipt(mockTransaction)
      
      expect(receipt).toContain('Mama หมู   x2')
      expect(receipt).toContain('น้ำดื่ม   x1')
      expect(receipt).toContain('฿60.00') // Mama หมู total
      expect(receipt).toContain('฿15.00') // น้ำดื่ม total
    })

    it('should format currency in Thai locale', () => {
      const receipt = receiptService.formatReceipt(mockTransaction)
      
      expect(receipt).toContain('฿75.00')
      expect(receipt).toMatch(/฿\d{1,3}(,\d{3})*\.\d{2}/)
    })

    it('should handle long product names by truncating', () => {
      const longNameTransaction = {
        ...mockTransaction,
        items: [{
          productId: '1',
          name: 'Very Long Product Name That Exceeds Maximum Length',
          sellingPrice: 100,
          costPrice: 80,
          quantity: 1
        }]
      }
      
      const receipt = receiptService.formatReceipt(longNameTransaction)
      expect(receipt).toContain('Very Long Product...')
    })
  })

  describe('logReceipt', () => {
    it('should log receipt to console', () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
      const testReceipt = 'Test Receipt Content'
      
      receiptService.logReceipt(testReceipt)
      
      expect(consoleSpy).toHaveBeenCalledWith('\n=== RECEIPT GENERATED ===')
      expect(consoleSpy).toHaveBeenCalledWith(testReceipt)
      expect(consoleSpy).toHaveBeenCalledWith('=== END RECEIPT ===\n')
      
      consoleSpy.mockRestore()
    })
  })

  describe('generateReceipt', () => {
    it('should format and log receipt', () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
      
      const receipt = receiptService.generateReceipt(mockTransaction)
      
      expect(receipt).toContain('ร้านค้าของเรา')
      expect(consoleSpy).toHaveBeenCalledWith('\n=== RECEIPT GENERATED ===')
      
      consoleSpy.mockRestore()
    })
  })

  describe('Thai formatting', () => {
    it('should format dates in Buddhist Era', () => {
      const receipt = receiptService.formatReceipt(mockTransaction)
      
      // 2024 + 543 = 2567 (Buddhist Era)
      expect(receipt).toContain('2567')
    })

    it('should display Thai characters correctly', () => {
      const receipt = receiptService.formatReceipt(mockTransaction)
      
      expect(receipt).toContain('ร้านค้าของเรา')
      expect(receipt).toContain('วันที่')
      expect(receipt).toContain('เวลา')
      expect(receipt).toContain('รายการสินค้า')
      expect(receipt).toContain('รวมทั้งสิ้น')
      expect(receipt).toContain('ขอบคุณที่ใช้บริการ')
    })
  })
})