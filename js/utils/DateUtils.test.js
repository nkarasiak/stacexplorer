import { describe, it, expect, beforeEach } from 'vitest';
import { DateUtils } from './DateUtils.js';

describe('DateUtils', () => {
  describe('formatDate', () => {
    it('should format a Date object into YYYY-MM-DD string', () => {
      const date = new Date('2024-01-01T12:00:00.000Z');
      expect(DateUtils.formatDate(date)).toBe('2024-01-01');
    });

    it('should return an empty string for invalid input', () => {
      expect(DateUtils.formatDate(null)).toBe('');
      expect(DateUtils.formatDate(undefined)).toBe('');
      expect(DateUtils.formatDate('2024-01-01')).toBe('');
      expect(DateUtils.formatDate(new Date('invalid date'))).toBe('');
    });
  });

  describe('parseDate', () => {
    it('should parse a YYYY-MM-DD string into a Date object', () => {
      const dateString = '2024-01-01';
      const expectedDate = new Date('2024-01-01T00:00:00.000Z');
      expect(DateUtils.parseDate(dateString)).toEqual(expectedDate);
    });

    it('should return null for invalid input', () => {
      expect(DateUtils.parseDate(null)).toBeNull();
      expect(DateUtils.parseDate(undefined)).toBeNull();
      expect(DateUtils.parseDate('invalid date')).toBeNull();
    });
  });

  describe('calculateDateRange', () => {
    it('should return null for start and end for "anytime"', () => {
      const range = DateUtils.calculateDateRange('anytime');
      expect(range.start).toBeNull();
      expect(range.end).toBeNull();
    });

    it('should return today\'s date for "today"', () => {
      const today = new Date();
      const expectedDate = today.toISOString().split('T')[0];
      const range = DateUtils.calculateDateRange('today');
      expect(range.start).toBe(expectedDate);
      expect(range.end).toBe(expectedDate);
    });

    it('should return the correct range for "last7days"', () => {
        const today = new Date();
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(today.getDate() - 6);

        const expectedStart = sevenDaysAgo.toISOString().split('T')[0];
        const expectedEnd = today.toISOString().split('T')[0];

        const range = DateUtils.calculateDateRange('last7days');
        expect(range.start).toBe(expectedStart);
        expect(range.end).toBe(expectedEnd);
    });

    it('should handle custom date ranges', () => {
      const start = '2023-01-01';
      const end = '2023-01-31';
      const range = DateUtils.calculateDateRange('custom', start, end);
      expect(range.start).toBe(start);
      expect(range.end).toBe(end);
    });
  });
});
