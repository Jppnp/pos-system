import { describe, it, expect } from 'vitest';
import {
  formatThaiCurrency,
  formatThaiDate,
  formatThaiDateTime,
  formatThaiBuddhistDate,
  formatThaiTime,
  formatThaiNumber,
  getThaiText,
  validateThaiText,
  isValidThaiProductName,
  THAI_TEXT
} from './localization';

describe('Thai Localization Utilities', () => {
  describe('formatThaiCurrency', () => {
    it('should format currency with Thai locale and ฿ symbol', () => {
      expect(formatThaiCurrency(1500.50)).toBe('฿1,500.50');
      expect(formatThaiCurrency(0)).toBe('฿0.00');
      expect(formatThaiCurrency(999999.99)).toBe('฿999,999.99');
    });
  });

  describe('formatThaiDate', () => {
    it('should format date in Thai locale', () => {
      const date = new Date('2024-01-15');
      const formatted = formatThaiDate(date);
      expect(formatted).toContain('2567'); // Buddhist Era (2024 + 543)
      expect(formatted).toContain('15');
      expect(formatted).toContain('มกราคม'); // January in Thai
    });
  });

  describe('formatThaiDateTime', () => {
    it('should format date and time in Thai locale', () => {
      const date = new Date('2024-01-15T14:30:25');
      const formatted = formatThaiDateTime(date);
      expect(formatted).toContain('2567'); // Buddhist Era (2024 + 543)
      expect(formatted).toContain('15');
      expect(formatted).toContain('14');
      expect(formatted).toContain('30');
    });
  });

  describe('formatThaiBuddhistDate', () => {
    it('should format date in Buddhist Era', () => {
      const date = new Date('2024-01-15');
      const formatted = formatThaiBuddhistDate(date);
      expect(formatted).toBe('15/01/2567'); // 2024 + 543 = 2567
    });
  });

  describe('formatThaiTime', () => {
    it('should format time in HH:MM:SS format', () => {
      const date = new Date('2024-01-15T14:30:25');
      const formatted = formatThaiTime(date);
      expect(formatted).toBe('14:30:25');
    });
  });

  describe('formatThaiNumber', () => {
    it('should format numbers with Thai locale comma separators', () => {
      expect(formatThaiNumber(1500)).toBe('1,500');
      expect(formatThaiNumber(999999)).toBe('999,999');
      expect(formatThaiNumber(0)).toBe('0');
    });
  });

  describe('getThaiText', () => {
    it('should return correct Thai text for given keys', () => {
      expect(getThaiText('loading')).toBe('กำลังโหลด...');
      expect(getThaiText('cart')).toBe('ตะกร้าสินค้า');
      expect(getThaiText('total')).toBe('รวมทั้งสิ้น');
    });
  });

  describe('validateThaiText', () => {
    it('should validate Thai text correctly', () => {
      expect(validateThaiText('สวัสดี')).toBe(true);
      expect(validateThaiText('Hello')).toBe(false);
      expect(validateThaiText('สวัสดี Hello')).toBe(true); // Mixed text
      expect(validateThaiText('')).toBe(false);
    });
  });

  describe('isValidThaiProductName', () => {
    it('should validate Thai product names correctly', () => {
      expect(isValidThaiProductName('Mama หมู')).toBe(true);
      expect(isValidThaiProductName('น้ำดื่ม')).toBe(true);
      expect(isValidThaiProductName('Product 123')).toBe(true);
      expect(isValidThaiProductName('')).toBe(false);
      expect(isValidThaiProductName('   ')).toBe(false);
    });
  });

  describe('THAI_TEXT constants', () => {
    it('should contain all required Thai text constants', () => {
      expect(THAI_TEXT.loading).toBe('กำลังโหลด...');
      expect(THAI_TEXT.cart).toBe('ตะกร้าสินค้า');
      expect(THAI_TEXT.checkout).toBe('ชำระเงิน');
      expect(THAI_TEXT.total).toBe('รวมทั้งสิ้น');
      expect(THAI_TEXT.login).toBe('เข้าสู่ระบบ');
      expect(THAI_TEXT.logout).toBe('ออกจากระบบ');
    });

    it('should have Thai characters in all text values', () => {
      Object.values(THAI_TEXT).forEach(text => {
        // Allow some English text for technical terms, but most should have Thai
        const hasThaiOrTechnical = validateThaiText(text) || 
          text.includes('POS') || 
          text.includes('...') ||
          text.includes('฿') ||
          /^[0-9\s\-\:\.\,]+$/.test(text); // Numbers, punctuation only
        
        expect(hasThaiOrTechnical).toBe(true);
      });
    });
  });
});