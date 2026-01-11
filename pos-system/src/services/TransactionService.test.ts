import { describe, it, expect, vi, beforeEach } from 'vitest'
import { receiptService } from './ReceiptService'
import type { Transaction } from '../lib/database'

describe('Receipt Generation Integration', () => {
  let mockTransaction: Transaction

  beforeEach(() => {
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

  it('should generate receipt with proper Thai formatting and logging', () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
    
    const receipt = receiptService.generateReceipt(mockTransaction)
    
    // Verify receipt content
    expect(receipt).toContain('ร้านค้าของเรา')
    expect(receipt).toContain('วันที่: 15/01/2567')
    expect(receipt).toContain('Mama หมู   x2')
    expect(receipt).toContain('น้ำดื่ม   x1')
    expect(receipt).toContain('รวมทั้งสิ้น: ฿75.00')
    expect(receipt).toContain('ขอบคุณที่ใช้บริการ')
    
    // Verify console logging
    expect(consoleSpy).toHaveBeenCalledWith('\n=== RECEIPT GENERATED ===')
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('ร้านค้าของเรา'))
    expect(consoleSpy).toHaveBeenCalledWith('=== END RECEIPT ===\n')
    
    consoleSpy.mockRestore()
  })

  it('should handle Thai characters correctly in receipt', () => {
    const thaiTransaction = {
      ...mockTransaction,
      items: [
        {
          productId: '1',
          name: 'ข้าวผัดกุ้ง',
          sellingPrice: 50,
          costPrice: 35,
          quantity: 1
        },
        {
          productId: '2',
          name: 'น้ำมะนาว',
          sellingPrice: 25,
          costPrice: 15,
          quantity: 2
        }
      ],
      total: 100,
      totalCost: 65,
      profit: 35
    }
    
    const receipt = receiptService.generateReceipt(thaiTransaction)
    
    expect(receipt).toContain('ข้าวผัดกุ้ง')
    expect(receipt).toContain('น้ำมะนาว')
    expect(receipt).toContain('฿100.00')
  })
})