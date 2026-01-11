import type { Transaction } from '../lib/database'

export interface ReceiptFormatter {
  formatReceipt: (transaction: Transaction) => string
  logReceipt: (receipt: string) => void
}

export class ReceiptService implements ReceiptFormatter {
  private readonly shopName = 'ร้านค้าของเรา'
  private readonly separator = '================================'
  private readonly itemSeparator = '--------------------------------'

  /**
   * Format a transaction into a Thai receipt template
   */
  formatReceipt(transaction: Transaction): string {
    const timestamp = new Date(transaction.timestamp)
    const dateStr = this.formatThaiDate(timestamp)
    const timeStr = this.formatThaiTime(timestamp)

    let receipt = ''
    receipt += this.separator + '\n'
    receipt += this.centerText(this.shopName) + '\n'
    receipt += this.separator + '\n'
    receipt += `วันที่: ${dateStr} เวลา: ${timeStr}\n`
    receipt += this.itemSeparator + '\n'
    receipt += 'รายการสินค้า:\n'

    // Add each item
    for (const item of transaction.items) {
      const itemLine = this.formatItemLine(item.name, item.quantity, item.sellingPrice * item.quantity)
      receipt += itemLine + '\n'
    }

    receipt += this.itemSeparator + '\n'
    receipt += `รวมทั้งสิ้น: ${this.formatCurrency(transaction.total)}\n`
    receipt += this.separator + '\n'
    receipt += this.centerText('ขอบคุณที่ใช้บริการ') + '\n'
    receipt += this.separator + '\n'

    return receipt
  }

  /**
   * Log receipt to console for development
   */
  logReceipt(receipt: string): void {
    console.log('\n=== RECEIPT GENERATED ===')
    console.log(receipt)
    console.log('=== END RECEIPT ===\n')
  }

  /**
   * Generate and log receipt for a transaction
   */
  generateReceipt(transaction: Transaction): string {
    const receipt = this.formatReceipt(transaction)
    this.logReceipt(receipt)
    return receipt
  }

  /**
   * Format Thai date (DD/MM/YYYY in Buddhist Era)
   */
  private formatThaiDate(date: Date): string {
    const day = date.getDate().toString().padStart(2, '0')
    const month = (date.getMonth() + 1).toString().padStart(2, '0')
    const buddhistYear = date.getFullYear() + 543 // Convert to Buddhist Era
    return `${day}/${month}/${buddhistYear}`
  }

  /**
   * Format Thai time (HH:MM:SS)
   */
  private formatThaiTime(date: Date): string {
    const hours = date.getHours().toString().padStart(2, '0')
    const minutes = date.getMinutes().toString().padStart(2, '0')
    const seconds = date.getSeconds().toString().padStart(2, '0')
    return `${hours}:${minutes}:${seconds}`
  }

  /**
   * Format currency in Thai locale with ฿ symbol
   */
  private formatCurrency(amount: number): string {
    return new Intl.NumberFormat('th-TH', {
      style: 'currency',
      currency: 'THB',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount)
  }

  /**
   * Format an item line with proper spacing
   */
  private formatItemLine(name: string, quantity: number, total: number): string {
    const maxNameLength = 20
    const truncatedName = name.length > maxNameLength 
      ? name.substring(0, maxNameLength - 3) + '...'
      : name

    const quantityStr = `x${quantity}`
    const totalStr = this.formatCurrency(total)
    
    // Calculate spacing to align currency amounts
    const nameAndQty = `${truncatedName} ${quantityStr.padStart(4)}`
    const padding = Math.max(1, 32 - nameAndQty.length - totalStr.length)
    
    return nameAndQty + ' '.repeat(padding) + totalStr
  }

  /**
   * Center text within the receipt width (32 characters)
   */
  private centerText(text: string): string {
    const receiptWidth = 32
    const padding = Math.max(0, Math.floor((receiptWidth - text.length) / 2))
    return ' '.repeat(padding) + text
  }
}

// Export singleton instance
export const receiptService = new ReceiptService()