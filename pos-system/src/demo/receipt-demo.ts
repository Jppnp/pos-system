/**
 * Demo script to showcase receipt generation functionality
 * This demonstrates the Thai formatting and console logging features
 */

import { receiptService } from '../services/ReceiptService'
import type { Transaction } from '../lib/database'

// Sample transaction data
const sampleTransaction: Transaction = {
  id: 'demo-001',
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
      quantity: 3
    },
    {
      productId: '3',
      name: 'ขนมปังแผ่น',
      sellingPrice: 25,
      costPrice: 20,
      quantity: 1
    }
  ],
  total: 130, // (30*2) + (15*3) + (25*1) = 60 + 45 + 25 = 130
  totalCost: 95, // (25*2) + (10*3) + (20*1) = 50 + 30 + 20 = 100
  profit: 35, // 130 - 95 = 35
  timestamp: new Date(),
  synced: false
}

// Generate and display receipt
console.log('='.repeat(50))
console.log('RECEIPT GENERATION DEMO')
console.log('='.repeat(50))

const receipt = receiptService.generateReceipt(sampleTransaction)

console.log('\n' + '='.repeat(50))
console.log('RECEIPT CONTENT VERIFICATION:')
console.log('='.repeat(50))
console.log('✓ Shop name in Thai:', receipt.includes('ร้านค้าของเรา'))
console.log('✓ Thai date format:', receipt.includes('วันที่:'))
console.log('✓ Thai time format:', receipt.includes('เวลา:'))
console.log('✓ Items section:', receipt.includes('รายการสินค้า:'))
console.log('✓ Total section:', receipt.includes('รวมทั้งสิ้น:'))
console.log('✓ Thank you message:', receipt.includes('ขอบคุณที่ใช้บริการ'))
console.log('✓ Thai currency format:', receipt.includes('฿130.00'))
console.log('✓ Product names in Thai:', receipt.includes('Mama หมู') && receipt.includes('น้ำดื่ม'))

export { sampleTransaction, receiptService }