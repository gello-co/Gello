/**
 * Handlebars Helpers Unit Tests
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { helpers } from '../../../ProjectSourceCode/src/express/helpers/handlebars.js';

describe('Handlebars Helpers', () => {
  describe('formatDate', () => {
    it('should format a date string', () => {
      // Use a date string with timezone to avoid local timezone issues
      const result = helpers.formatDate('2024-01-15T12:00:00Z');
      expect(result).toContain('2024');
      expect(result).toContain('January');
    });

    it('should format a Date object', () => {
      // Create date in a way that avoids timezone issues
      const date = new Date(2024, 0, 15); // Month is 0-indexed
      const result = helpers.formatDate(date);
      expect(result).toBe('January 15, 2024');
    });

    it('should return empty string for null/undefined', () => {
      expect(helpers.formatDate(null as unknown as string)).toBe('');
      expect(helpers.formatDate(undefined as unknown as string)).toBe('');
    });

    it('should return empty string for invalid date', () => {
      expect(helpers.formatDate('invalid-date')).toBe('');
    });
  });

  describe('timeAgo', () => {
    beforeEach(() => {
      // Mock Date.now to return a fixed time for consistent testing
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2024-06-15T12:00:00Z'));
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('should return "just now" for very recent dates', () => {
      const result = helpers.timeAgo(new Date('2024-06-15T11:59:30Z'));
      expect(result).toBe('just now');
    });

    it('should return minutes ago for recent dates', () => {
      const result = helpers.timeAgo(new Date('2024-06-15T11:55:00Z'));
      expect(result).toBe('5 minutes ago');
    });

    it('should return singular for 1 minute', () => {
      const result = helpers.timeAgo(new Date('2024-06-15T11:59:00Z'));
      expect(result).toBe('1 minute ago');
    });

    it('should return hours ago', () => {
      const result = helpers.timeAgo(new Date('2024-06-15T10:00:00Z'));
      expect(result).toBe('2 hours ago');
    });

    it('should return days ago', () => {
      const result = helpers.timeAgo(new Date('2024-06-13T12:00:00Z'));
      expect(result).toBe('2 days ago');
    });

    it('should return weeks ago', () => {
      const result = helpers.timeAgo(new Date('2024-06-01T12:00:00Z'));
      expect(result).toBe('2 weeks ago');
    });

    it('should return months ago', () => {
      const result = helpers.timeAgo(new Date('2024-04-15T12:00:00Z'));
      expect(result).toBe('2 months ago');
    });

    it('should return years ago', () => {
      const result = helpers.timeAgo(new Date('2022-06-15T12:00:00Z'));
      expect(result).toBe('2 years ago');
    });

    it('should handle future dates', () => {
      const result = helpers.timeAgo(new Date('2024-06-15T14:00:00Z'));
      expect(result).toBe('in 2 hours');
    });

    it('should return empty string for null/undefined', () => {
      expect(helpers.timeAgo(null as unknown as Date)).toBe('');
      expect(helpers.timeAgo(undefined as unknown as Date)).toBe('');
    });

    it('should return empty string for invalid date', () => {
      expect(helpers.timeAgo('invalid-date')).toBe('');
    });
  });

  describe('pluralize', () => {
    it('should return singular for count of 1', () => {
      expect(helpers.pluralize(1, 'item', 'items')).toBe('item');
    });

    it('should return plural for count of 0', () => {
      expect(helpers.pluralize(0, 'item', 'items')).toBe('items');
    });

    it('should return plural for count > 1', () => {
      expect(helpers.pluralize(5, 'item', 'items')).toBe('items');
    });

    it('should auto-pluralize if no plural provided', () => {
      expect(helpers.pluralize(0, 'task')).toBe('tasks');
      expect(helpers.pluralize(2, 'board')).toBe('boards');
    });

    it('should handle singular when no plural provided', () => {
      expect(helpers.pluralize(1, 'task')).toBe('task');
    });
  });

  describe('truncate', () => {
    it('should truncate text longer than specified length', () => {
      const text = 'This is a very long text that should be truncated';
      expect(helpers.truncate(text, 20)).toBe('This is a very long...');
    });

    it('should not truncate text shorter than length', () => {
      const text = 'Short text';
      expect(helpers.truncate(text, 50)).toBe('Short text');
    });

    it('should use custom suffix', () => {
      const text = 'This is a very long text';
      expect(helpers.truncate(text, 10, ' [more]')).toBe('This is a [more]');
    });

    it('should return empty string for null/undefined', () => {
      expect(helpers.truncate(null as unknown as string, 10)).toBe('');
      expect(helpers.truncate(undefined as unknown as string, 10)).toBe('');
    });

    it('should handle empty string', () => {
      expect(helpers.truncate('', 10)).toBe('');
    });

    it('should handle exact length', () => {
      const text = 'Exact';
      expect(helpers.truncate(text, 5)).toBe('Exact');
    });
  });

  describe('comparison helpers', () => {
    it('eq should compare values', () => {
      expect(helpers.eq(1, 1)).toBe(true);
      expect(helpers.eq(1, 2)).toBe(false);
      expect(helpers.eq('a', 'a')).toBe(true);
    });

    it('ne should check inequality', () => {
      expect(helpers.ne(1, 2)).toBe(true);
      expect(helpers.ne(1, 1)).toBe(false);
    });

    it('gt should check greater than', () => {
      expect(helpers.gt(5, 3)).toBe(true);
      expect(helpers.gt(3, 5)).toBe(false);
    });

    it('lt should check less than', () => {
      expect(helpers.lt(3, 5)).toBe(true);
      expect(helpers.lt(5, 3)).toBe(false);
    });

    it('gte should check greater than or equal', () => {
      expect(helpers.gte(5, 5)).toBe(true);
      expect(helpers.gte(5, 3)).toBe(true);
      expect(helpers.gte(3, 5)).toBe(false);
    });

    it('lte should check less than or equal', () => {
      expect(helpers.lte(5, 5)).toBe(true);
      expect(helpers.lte(3, 5)).toBe(true);
      expect(helpers.lte(5, 3)).toBe(false);
    });
  });

  describe('logical helpers', () => {
    it('and should return true if both are truthy', () => {
      expect(helpers.and(true, true)).toBe(true);
      expect(helpers.and(true, false)).toBe(false);
      expect(helpers.and(false, true)).toBe(false);
    });

    it('or should return true if any are truthy', () => {
      expect(helpers.or(true, false)).toBe(true);
      expect(helpers.or(false, true)).toBe(true);
      expect(helpers.or(false, false)).toBe(false);
    });

    it('not should negate value', () => {
      expect(helpers.not(true)).toBe(false);
      expect(helpers.not(false)).toBe(true);
      expect(helpers.not('')).toBe(true);
      expect(helpers.not('text')).toBe(false);
    });
  });

  describe('array helpers', () => {
    it('contains should check if array contains item', () => {
      expect(helpers.contains([1, 2, 3], 2)).toBe(true);
      expect(helpers.contains([1, 2, 3], 4)).toBe(false);
      expect(helpers.contains([], 1)).toBe(false);
    });

    it('length should return array length', () => {
      expect(helpers.length([1, 2, 3])).toBe(3);
      expect(helpers.length([])).toBe(0);
      expect(helpers.length(null as unknown as Array<unknown>)).toBe(0);
    });
  });

  describe('string helpers', () => {
    it('uppercase should convert to uppercase', () => {
      expect(helpers.uppercase('hello')).toBe('HELLO');
      expect(helpers.uppercase(null as unknown as string)).toBe('');
    });

    it('lowercase should convert to lowercase', () => {
      expect(helpers.lowercase('HELLO')).toBe('hello');
      expect(helpers.lowercase(null as unknown as string)).toBe('');
    });

    it('capitalize should capitalize first letter', () => {
      expect(helpers.capitalize('hello world')).toBe('Hello world');
      expect(helpers.capitalize('HELLO')).toBe('Hello');
      expect(helpers.capitalize('')).toBe('');
    });

    it('substring should extract substring', () => {
      expect(helpers.substring('hello world', 0, 5)).toBe('hello');
      expect(helpers.substring('hello world', 6)).toBe('world');
      expect(helpers.substring(null as unknown as string, 0, 5)).toBe('');
    });
  });

  describe('url helper', () => {
    it('should ensure path starts with /', () => {
      expect(helpers.url('path')).toBe('/path');
      expect(helpers.url('/path')).toBe('/path');
    });

    it('should return / for empty path', () => {
      expect(helpers.url('')).toBe('/');
      expect(helpers.url(null as unknown as string)).toBe('/');
    });
  });

  describe('json helper', () => {
    it('should stringify object', () => {
      const obj = { a: 1, b: 'test' };
      const result = helpers.json(obj);
      expect(result).toBe('{\n  "a": 1,\n  "b": "test"\n}');
    });

    it('should handle circular references', () => {
      const obj: Record<string, unknown> = { a: 1 };
      obj.self = obj;
      expect(helpers.json(obj)).toBe('[Unable to stringify]');
    });
  });
});
