import type { SupabaseClient } from "@supabase/supabase-js";
import type { NextFunction, Request, Response } from "express";
import { describe, expect, it } from "vitest";
import { injectServices } from "@/middleware/injectServices";

describe("injectServices Middleware Unit Tests", () => {
  it("should inject all 5 services when req.supabase is available", () => {
    // Arrange
    const mockSupabase = {} as SupabaseClient;
    const req = {
      supabase: mockSupabase,
    } as Request;
    const res = {
      locals: {},
    } as Response;
    let nextCalled = false;
    const next = (() => {
      nextCalled = true;
    }) as NextFunction;

    // Act
    injectServices(req, res, next);

    // Assert
    expect(nextCalled).toBe(true);
    expect(res.locals.services).toBeDefined();
    expect(res.locals.services.board).toBeDefined();
    expect(res.locals.services.list).toBeDefined();
    expect(res.locals.services.task).toBeDefined();
    expect(res.locals.services.points).toBeDefined();
    expect(res.locals.services.leaderboard).toBeDefined();
  });

  it("should call next() even when req.supabase is not available", () => {
    // Arrange
    const req = {} as Request;
    const res = {
      locals: {},
    } as Response;
    let nextCalled = false;
    const next = (() => {
      nextCalled = true;
    }) as NextFunction;

    // Act
    injectServices(req, res, next);

    // Assert
    expect(nextCalled).toBe(true);
    expect(res.locals.services).toBeUndefined();
  });

  it("should use the same Supabase client for all services", () => {
    // Arrange
    const mockSupabase = {} as SupabaseClient;
    const req = {
      supabase: mockSupabase,
    } as Request;
    const res = {
      locals: {},
    } as Response;
    const next = (() => {}) as NextFunction;

    // Act
    injectServices(req, res, next);

    // Assert - services should have been instantiated with the same client
    expect(res.locals.services).toBeDefined();
    expect(res.locals.services.board).toBeDefined();
    expect(res.locals.services.list).toBeDefined();
    expect(res.locals.services.task).toBeDefined();
    expect(res.locals.services.points).toBeDefined();
    expect(res.locals.services.leaderboard).toBeDefined();
  });
});
