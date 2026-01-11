/**
 * Thai localization utilities for the POS system
 * Provides consistent Thai text and formatting throughout the application
 */

// Thai text constants
export const THAI_TEXT = {
  // Common UI elements
  loading: 'กำลังโหลด...',
  error: 'เกิดข้อผิดพลาด',
  success: 'สำเร็จ',
  cancel: 'ยกเลิก',
  save: 'บันทึก',
  delete: 'ลบ',
  edit: 'แก้ไข',
  add: 'เพิ่ม',
  remove: 'ลบออก',
  update: 'อัปเดต',
  create: 'สร้าง',
  search: 'ค้นหา',
  filter: 'กรอง',
  clear: 'ล้าง',
  submit: 'ส่ง',
  reset: 'รีเซ็ต',
  close: 'ปิด',
  
  // POS specific
  cart: 'ตะกร้าสินค้า',
  product: 'สินค้า',
  products: 'สินค้าทั้งหมด',
  quantity: 'จำนวน',
  price: 'ราคา',
  total: 'รวมทั้งสิ้น',
  subtotal: 'รวมย่อย',
  checkout: 'ชำระเงิน',
  receipt: 'ใบเสร็จ',
  transaction: 'รายการขาย',
  transactions: 'รายการขายทั้งหมด',
  sales: 'ยอดขาย',
  profit: 'กำไร',
  cost: 'ต้นทุน',
  
  // Authentication
  login: 'เข้าสู่ระบบ',
  logout: 'ออกจากระบบ',
  email: 'อีเมล',
  password: 'รหัสผ่าน',
  
  // Dashboard
  dashboard: 'แดชบอร์ด',
  salesDashboard: 'แดชบอร์ดยอดขาย',
  todaySales: 'ยอดขายวันนี้',
  totalSales: 'ยอดขายรวม',
  totalProfit: 'กำไรรวม',
  totalCost: 'ต้นทุนรวม',
  transactionCount: 'จำนวนรายการ',
  
  // Time periods
  today: 'วันนี้',
  thisWeek: 'สัปดาห์นี้',
  thisMonth: 'เดือนนี้',
  custom: 'กำหนดเอง',
  
  // Date labels
  startDate: 'วันที่เริ่มต้น',
  endDate: 'วันที่สิ้นสุด',
  dateRange: 'ช่วงวันที่',
  
  // Status
  online: 'ออนไลน์',
  offline: 'ออฟไลน์',
  synced: 'ซิงค์แล้ว',
  pending: 'รอซิงค์',
  syncing: 'กำลังซิงค์...',
  
  // Messages
  emptyCart: 'ตะกร้าว่าง - ค้นหาและเพิ่มสินค้าเพื่อเริ่มต้น',
  noTransactions: 'ไม่พบประวัติการขาย',
  noProducts: 'ไม่พบสินค้า',
  noSearchResults: 'ไม่พบสินค้าที่ตรงกับ',
  loadingData: 'กำลังโหลดข้อมูล...',
  
  // Errors
  loginError: 'เกิดข้อผิดพลาดในการเข้าสู่ระบบ',
  networkError: 'เกิดข้อผิดพลาดในการเชื่อมต่อเครือข่าย',
  dataError: 'เกิดข้อผิดพลาดในการโหลดข้อมูล',
  
  // PWA
  installApp: 'ติดตั้งแอป POS',
  installDescription: 'ติดตั้งแอปเพื่อใช้งานแบบออฟไลน์และเข้าถึงได้ง่ายขึ้น',
  install: 'ติดตั้ง',
  notNow: 'ไม่ใช่ตอนนี้',
  updateAvailable: 'อัปเดตใหม่พร้อมใช้งาน',
  updateDescription: 'มีเวอร์ชันใหม่ของแอป คลิกเพื่ออัปเดต',
  updateNow: 'อัปเดต',
  updateLater: 'ภายหลัง',
  offlineReady: 'พร้อมใช้งานออฟไลน์',
  offlineDescription: 'แอปพร้อมใช้งานแบบออฟไลน์แล้ว',
} as const;

/**
 * Format currency in Thai locale with ฿ symbol
 */
export function formatThaiCurrency(amount: number): string {
  return new Intl.NumberFormat('th-TH', {
    style: 'currency',
    currency: 'THB'
  }).format(amount);
}

/**
 * Format date in Thai locale
 */
export function formatThaiDate(date: Date): string {
  return new Intl.DateTimeFormat('th-TH', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  }).format(date);
}

/**
 * Format date and time in Thai locale
 */
export function formatThaiDateTime(date: Date): string {
  return new Intl.DateTimeFormat('th-TH', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  }).format(date);
}

/**
 * Format date for Buddhist Era (used in receipts)
 */
export function formatThaiBuddhistDate(date: Date): string {
  const day = date.getDate().toString().padStart(2, '0');
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const year = (date.getFullYear() + 543).toString(); // Convert to Buddhist Era
  return `${day}/${month}/${year}`;
}

/**
 * Format time in Thai format (HH:MM:SS)
 */
export function formatThaiTime(date: Date): string {
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  const seconds = date.getSeconds().toString().padStart(2, '0');
  return `${hours}:${minutes}:${seconds}`;
}

/**
 * Format number with Thai locale (comma separators)
 */
export function formatThaiNumber(num: number): string {
  return new Intl.NumberFormat('th-TH').format(num);
}

/**
 * Get Thai text for a given key
 */
export function getThaiText(key: keyof typeof THAI_TEXT): string {
  return THAI_TEXT[key];
}

/**
 * Validate Thai text rendering
 * Ensures Thai characters are properly displayed
 */
export function validateThaiText(text: string): boolean {
  // Check if text contains Thai characters
  const thaiRegex = /[\u0E00-\u0E7F]/;
  return thaiRegex.test(text);
}

/**
 * Thai-specific validation for product names
 */
export function isValidThaiProductName(name: string): boolean {
  // Allow Thai characters, English characters, numbers, and common symbols
  const validPattern = /^[\u0E00-\u0E7Fa-zA-Z0-9\s\-\(\)\[\]\.\/]+$/;
  return validPattern.test(name) && name.trim().length > 0;
}

export default {
  THAI_TEXT,
  formatThaiCurrency,
  formatThaiDate,
  formatThaiDateTime,
  formatThaiBuddhistDate,
  formatThaiTime,
  formatThaiNumber,
  getThaiText,
  validateThaiText,
  isValidThaiProductName,
};