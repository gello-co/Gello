export const helpers = {
  formatDate: (date: Date | string, _format?: string) => {
    if (!date) return "";
    const d = typeof date === "string" ? new Date(date) : date;
    if (Number.isNaN(d.getTime())) return "";
    return d.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  },
  eq: (a: unknown, b: unknown) => a === b,
  gt: (a: number, b: number) => a > b,
  lt: (a: number, b: number) => a < b,
  gte: (a: number, b: number) => a >= b,
  lte: (a: number, b: number) => a <= b,
  ne: (a: unknown, b: unknown) => a !== b,
  and: (a: unknown, b: unknown) => a && b,
  // or helper - handles variable number of args, ignores Handlebars options object
  or: (...args: unknown[]) => {
    // Filter out Handlebars options object (has 'name', 'hash', 'data' properties)
    const values = args.filter(
      (arg) =>
        !(
          arg &&
          typeof arg === "object" &&
          "name" in arg &&
          "hash" in arg &&
          "data" in arg
        ),
    );
    return values.some((v) => Boolean(v));
  },
  not: (a: unknown) => !a,
  // Array helpers
  contains: (arr: unknown[], item: unknown) => arr?.includes(item) ?? false,
  length: (arr: unknown[]) => arr?.length ?? 0,
  // String helpers
  uppercase: (str: string) => str?.toUpperCase() ?? "",
  lowercase: (str: string) => str?.toLowerCase() ?? "",
  capitalize: (str: string) => {
    if (!str) return "";
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
  },
  substring: (str: string, start: number, end?: number) => {
    return str?.substring(start, end) ?? "";
  },
  // URL helpers
  url: (path: string) => {
    if (!path) return "/";
    return path.startsWith("/") ? path : `/${path}`;
  },
  // Debug helpers
  json: (obj: unknown) => {
    try {
      return JSON.stringify(obj, null, 2);
    } catch {
      return "[Unable to stringify]";
    }
  },
};
