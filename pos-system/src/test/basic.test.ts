import { describe, it, expect } from 'vitest';

describe('Basic Test Suite', () => {
  it('should pass basic math test', () => {
    expect(2 + 2).toBe(4);
  });

  it('should handle string operations', () => {
    expect('hello'.toUpperCase()).toBe('HELLO');
  });

  it('should work with arrays', () => {
    const arr = [1, 2, 3];
    expect(arr.length).toBe(3);
    expect(arr.includes(2)).toBe(true);
  });

  it('should handle Thai text', () => {
    const thaiText = 'ระบบขายหน้าร้าน';
    expect(thaiText.length).toBeGreaterThan(0);
    expect(thaiText).toContain('ระบบ');
  });
});