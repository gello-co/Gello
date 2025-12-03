/**
 * Unit tests for 404 Not Found handler middleware
 */

import type { NextFunction, Request, Response } from "express";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { notFoundHandler } from "../../../ProjectSourceCode/src/middleware/notFoundHandler.js";

describe("notFoundHandler middleware", () => {
  let req: Partial<Request>;
  let res: Partial<Response>;
  let next: NextFunction;

  beforeEach(() => {
    req = {
      path: "/non-existent-route",
      method: "GET",
    };

    res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
      render: vi.fn(),
    };

    next = vi.fn() as unknown as NextFunction;
  });

  it("should call next with ResourceNotFoundError", () => {
    notFoundHandler(req as Request, res as Response, next);

    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({
        message: expect.stringContaining("GET /non-existent-route"),
        name: "ResourceNotFoundError",
      }),
    );
  });

  it("should include request method and path in error message", () => {
    // Create a new request object with the different path/method
    req = {
      path: "/api/invalid",
      method: "POST",
    };

    notFoundHandler(req as Request, res as Response, next);

    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({
        message: "Not found: POST /api/invalid",
      }),
    );
  });
});
