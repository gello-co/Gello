import type { NextFunction, Request, Response } from "express";
import { describe, expect, it } from "vitest";
import { z } from "zod";
import {
  validateBody,
  validateParams,
  validateQuery,
} from "@/middleware/validation";

describe("Validation Middleware Unit Tests", () => {
  const testSchema = z.object({
    name: z.string().min(1, "Name is required"),
    age: z.number().min(0, "Age must be positive"),
  });

  describe("validateBody", () => {
    it("should pass valid data through", async () => {
      const req = {
        body: { name: "John", age: 30 },
        path: "/test",
      } as Request;
      const res = {} as Response;
      let nextCalled = false;
      const next = (() => {
        nextCalled = true;
      }) as NextFunction;

      const middleware = validateBody(testSchema);
      await middleware(req, res, next);

      expect(nextCalled).toBe(true);
      expect(req.body).toEqual({ name: "John", age: 30 });
    });

    it("should reject invalid data with 400", async () => {
      const req = {
        body: { name: "", age: -1 },
        path: "/test",
      } as Request;

      let statusCode = 0;
      let jsonCalled = false;
      const res = {
        status(code: number) {
          statusCode = code;
          return this;
        },
        json(_data: any) {
          jsonCalled = true;
          return this;
        },
      } as unknown as Response;

      let nextCalled = false;
      const next = (() => {
        nextCalled = true;
      }) as NextFunction;

      const middleware = validateBody(testSchema);
      await middleware(req, res, next);

      expect(statusCode).toBe(400);
      expect(jsonCalled).toBe(true);
      expect(nextCalled).toBe(false);
    });
  });

  describe("validateQuery", () => {
    const querySchema = z.object({
      page: z.coerce.number().min(1),
      limit: z.coerce.number().min(1).max(100),
    });

    it("should validate query parameters", async () => {
      const req = {
        query: { page: "1", limit: "10" },
        path: "/test",
      } as unknown as Request;
      const res = {} as Response;
      let nextCalled = false;
      const next = (() => {
        nextCalled = true;
      }) as NextFunction;

      const middleware = validateQuery(querySchema);
      await middleware(req, res, next);

      expect(nextCalled).toBe(true);
      // z.coerce.number() converts strings to numbers
      const parsedQuery = req.query as unknown as {
        page: number;
        limit: number;
      };
      expect(parsedQuery.page).toBe(1);
      expect(parsedQuery.limit).toBe(10);
    });

    it("should reject invalid query parameters", async () => {
      const req = {
        query: { page: "0", limit: "200" },
        path: "/test",
      } as unknown as Request;

      let statusCode = 0;
      const res = {
        status(code: number) {
          statusCode = code;
          return this;
        },
        json(_data: any) {
          return this;
        },
      } as unknown as Response;

      const next = (() => {}) as NextFunction;

      const middleware = validateQuery(querySchema);
      await middleware(req, res, next);

      expect(statusCode).toBe(400);
    });
  });

  describe("validateParams", () => {
    const paramsSchema = z.object({
      id: z.string().uuid("Invalid ID format"),
    });

    it("should validate URL parameters", async () => {
      const validUuid = "123e4567-e89b-12d3-a456-426614174000";
      const req = {
        params: { id: validUuid },
        path: "/test",
      } as unknown as Request;
      const res = {} as Response;
      let nextCalled = false;
      const next = (() => {
        nextCalled = true;
      }) as NextFunction;

      const middleware = validateParams(paramsSchema);
      await middleware(req, res, next);

      expect(nextCalled).toBe(true);
      expect(req.params.id).toBe(validUuid);
    });

    it("should reject invalid UUID format", async () => {
      const req = {
        params: { id: "not-a-uuid" },
        path: "/test",
      } as unknown as Request;

      let statusCode = 0;
      const res = {
        status(code: number) {
          statusCode = code;
          return this;
        },
        json(_data: any) {
          return this;
        },
      } as unknown as Response;

      const next = (() => {}) as NextFunction;

      const middleware = validateParams(paramsSchema);
      await middleware(req, res, next);

      expect(statusCode).toBe(400);
    });
  });
});
