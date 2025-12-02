import { describe, expect, it } from "bun:test";
import {
  calculateTaskPoints,
  validateManualAward,
} from "../../../ProjectSourceCode/src/lib/utils/points";

describe("Points Utilities (bun)", () => {
  describe("calculateTaskPoints", () => {
    it("maps Fibonacci story points directly", () => {
      [1, 2, 3, 5, 8, 13].forEach((value) => {
        expect(calculateTaskPoints(value)).toBe(value);
      });
    });

    it("handles zero", () => {
      expect(calculateTaskPoints(0)).toBe(0);
    });

    it("throws on invalid input", () => {
      expect(() => calculateTaskPoints(-1)).toThrow();
      expect(() => calculateTaskPoints(null as unknown as number)).toThrow();
    });
  });

  describe("validateManualAward", () => {
    it("accepts positive values", () => {
      expect(validateManualAward(1)).toBe(true);
      expect(validateManualAward(100)).toBe(true);
    });

    it("rejects zero/negative/undefined", () => {
      expect(validateManualAward(0)).toBe(false);
      expect(validateManualAward(-5)).toBe(false);
      expect(validateManualAward(undefined as unknown as number)).toBe(false);
    });
  });
});
