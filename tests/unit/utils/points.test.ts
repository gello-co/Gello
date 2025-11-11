import { describe, expect, it } from "vitest";
import {
  calculateTaskPoints,
  validateManualAward,
} from "../../../ProjectSourceCode/src/lib/utils/points";

describe("Points Utilities", () => {
  describe("calculateTaskPoints", () => {
    it("should convert story points 1:1 to points", () => {
      expect(calculateTaskPoints(1)).toBe(1);
      expect(calculateTaskPoints(2)).toBe(2);
      expect(calculateTaskPoints(3)).toBe(3);
      expect(calculateTaskPoints(5)).toBe(5);
      expect(calculateTaskPoints(8)).toBe(8);
      expect(calculateTaskPoints(13)).toBe(13);
    });

    it("should handle zero story points", () => {
      expect(calculateTaskPoints(0)).toBe(0);
    });

    it("should handle large story point values", () => {
      expect(calculateTaskPoints(100)).toBe(100);
      expect(calculateTaskPoints(1000)).toBe(1000);
    });

    it("should throw error for negative story points", () => {
      expect(() => calculateTaskPoints(-1)).toThrow();
      expect(() => calculateTaskPoints(-10)).toThrow();
    });

    it("should throw error for null/undefined story points", () => {
      expect(() => calculateTaskPoints(null as unknown as number)).toThrow();
      expect(() =>
        calculateTaskPoints(undefined as unknown as number),
      ).toThrow();
    });
  });

  describe("validateManualAward", () => {
    it("should validate positive point awards", () => {
      expect(validateManualAward(1)).toBe(true);
      expect(validateManualAward(5)).toBe(true);
      expect(validateManualAward(10)).toBe(true);
      expect(validateManualAward(100)).toBe(true);
    });

    it("should reject zero points", () => {
      expect(validateManualAward(0)).toBe(false);
    });

    it("should reject negative points", () => {
      expect(validateManualAward(-1)).toBe(false);
      expect(validateManualAward(-10)).toBe(false);
    });

    it("should reject null/undefined", () => {
      expect(validateManualAward(null as unknown as number)).toBe(false);
      expect(validateManualAward(undefined as unknown as number)).toBe(false);
    });

    it("should handle very large values", () => {
      expect(validateManualAward(10000)).toBe(true);
      expect(validateManualAward(Number.MAX_SAFE_INTEGER)).toBe(true);
    });
  });
});
