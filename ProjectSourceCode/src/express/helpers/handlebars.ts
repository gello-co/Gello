export const helpers = {
  formatDate: (date: Date | string, _format?: string) => {
    if (!date) return '';
    const d = typeof date === 'string' ? new Date(date) : date;
    if (Number.isNaN(d.getTime())) return '';
    return d.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  },
  /**
   * Returns a human-readable relative time string (e.g., "2 hours ago", "in 3 days")
   */
  timeAgo: (date: Date | string) => {
    if (!date) return '';
    const d = typeof date === 'string' ? new Date(date) : date;
    if (Number.isNaN(d.getTime())) return '';

    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffSec = Math.floor(Math.abs(diffMs) / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHour = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHour / 24);
    const diffWeek = Math.floor(diffDay / 7);
    const diffMonth = Math.floor(diffDay / 30);
    const diffYear = Math.floor(diffDay / 365);

    const isPast = diffMs > 0;
    const formatResult = (value: number, unit: string) => {
      const plural = value === 1 ? '' : 's';
      return isPast ? `${value} ${unit}${plural} ago` : `in ${value} ${unit}${plural}`;
    };

    if (diffSec < 60) return isPast ? 'just now' : 'in a moment';
    if (diffMin < 60) return formatResult(diffMin, 'minute');
    if (diffHour < 24) return formatResult(diffHour, 'hour');
    if (diffDay < 7) return formatResult(diffDay, 'day');
    if (diffWeek < 4) return formatResult(diffWeek, 'week');
    if (diffMonth < 12) return formatResult(diffMonth, 'month');
    return formatResult(diffYear, 'year');
  },
  /**
   * Pluralizes a word based on count
   * Usage: {{pluralize count "item" "items"}} or {{pluralize count "item"}}
   */
  pluralize: (count: number, singular: string, plural?: string) => {
    if (count === 1) return singular;
    return plural ?? `${singular}s`;
  },
  /**
   * Truncates text to a specified length with ellipsis
   * Usage: {{truncate text 100}} or {{truncate text 100 "..."}}
   */
  truncate: (text: string, length: number, suffix?: string) => {
    if (!text) return '';
    const ellipsis = typeof suffix === 'string' ? suffix : '...';
    if (text.length <= length) return text;
    return text.substring(0, length).trim() + ellipsis;
  },
  eq: (a: unknown, b: unknown) => a === b,
  gt: (a: number, b: number) => a > b,
  lt: (a: number, b: number) => a < b,
  gte: (a: number, b: number) => a >= b,
  lte: (a: number, b: number) => a <= b,
  ne: (a: unknown, b: unknown) => a !== b,
  and: (a: unknown, b: unknown) => a && b,
  // or helper - handles variable number of args, ignores Handlebars options object
  or: (...args: Array<unknown>) => {
    // Filter out Handlebars options object (has 'name', 'hash', 'data' properties)
    const values = args.filter(
      (arg) => !(arg && typeof arg === 'object' && 'name' in arg && 'hash' in arg && 'data' in arg)
    );
    return values.some((v) => Boolean(v));
  },
  not: (a: unknown) => !a,
  // Array helpers
  contains: (arr: Array<unknown>, item: unknown) => arr?.includes(item) ?? false,
  length: (arr: Array<unknown>) => arr?.length ?? 0,
  // String helpers
  uppercase: (str: string) => str?.toUpperCase() ?? '',
  lowercase: (str: string) => str?.toLowerCase() ?? '',
  capitalize: (str: string) => {
    if (!str) return '';
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
  },
  substring: (str: string, start: number, end?: number) => {
    return str?.substring(start, end) ?? '';
  },
  // URL helpers
  url: (path: string) => {
    if (!path) return '/';
    return path.startsWith('/') ? path : `/${path}`;
  },
  // Debug helpers
  json: (obj: unknown) => {
    try {
      return JSON.stringify(obj, null, 2);
    } catch {
      return '[Unable to stringify]';
    }
  },
};
