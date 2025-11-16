import { describe, expect, it } from "vitest";
import {
  canManageBoard,
  canManageList,
  canManageTask,
  canManageTeam,
  canManageUsers,
  canViewAllUsers,
  isAdmin,
  isManager,
  isMember,
} from "../../../ProjectSourceCode/src/lib/utils/permissions";

describe("Permission Utilities", () => {
  describe("isAdmin", () => {
    it("should return true for admin role", () => {
      expect(isAdmin("admin")).toBe(true);
    });

    it("should return false for non-admin roles", () => {
      expect(isAdmin("manager")).toBe(false);
      expect(isAdmin("member")).toBe(false);
    });

    it("should return false for invalid roles", () => {
      expect(isAdmin("invalid")).toBe(false);
      expect(isAdmin("")).toBe(false);
    });
  });

  describe("isManager", () => {
    it("should return true for manager role", () => {
      expect(isManager("manager")).toBe(true);
    });

    it("should return false for non-manager roles", () => {
      expect(isManager("admin")).toBe(false);
      expect(isManager("member")).toBe(false);
    });

    it("should return false for invalid roles", () => {
      expect(isManager("invalid")).toBe(false);
      expect(isManager("")).toBe(false);
    });
  });

  describe("isMember", () => {
    it("should return true for member role", () => {
      expect(isMember("member")).toBe(true);
    });

    it("should return false for non-member roles", () => {
      expect(isMember("admin")).toBe(false);
      expect(isMember("manager")).toBe(false);
    });

    it("should return false for invalid roles", () => {
      expect(isMember("invalid")).toBe(false);
      expect(isMember("")).toBe(false);
    });
  });

  describe("canManageTeam", () => {
    it("should return true for admin", () => {
      expect(canManageTeam("admin")).toBe(true);
    });

    it("should return true for manager", () => {
      expect(canManageTeam("manager")).toBe(true);
    });

    it("should return false for member", () => {
      expect(canManageTeam("member")).toBe(false);
    });

    it("should return false for invalid roles", () => {
      expect(canManageTeam("invalid")).toBe(false);
      expect(canManageTeam("")).toBe(false);
    });
  });

  describe("canManageBoard", () => {
    it("should return true for admin", () => {
      expect(canManageBoard("admin")).toBe(true);
    });

    it("should return true for manager", () => {
      expect(canManageBoard("manager")).toBe(true);
    });

    it("should return false for member", () => {
      expect(canManageBoard("member")).toBe(false);
    });

    it("should return false for invalid roles", () => {
      expect(canManageBoard("invalid")).toBe(false);
      expect(canManageBoard("")).toBe(false);
    });
  });

  describe("canManageList", () => {
    it("should return true for admin", () => {
      expect(canManageList("admin")).toBe(true);
    });

    it("should return true for manager", () => {
      expect(canManageList("manager")).toBe(true);
    });

    it("should return false for member", () => {
      expect(canManageList("member")).toBe(false);
    });

    it("should return false for invalid roles", () => {
      expect(canManageList("invalid")).toBe(false);
      expect(canManageList("")).toBe(false);
    });
  });

  describe("canManageTask", () => {
    it("should return true for admin", () => {
      expect(canManageTask("admin")).toBe(true);
    });

    it("should return true for manager", () => {
      expect(canManageTask("manager")).toBe(true);
    });

    it("should return false for member", () => {
      expect(canManageTask("member")).toBe(false);
    });

    it("should return false for invalid roles", () => {
      expect(canManageTask("invalid")).toBe(false);
      expect(canManageTask("")).toBe(false);
    });
  });

  describe("canViewAllUsers", () => {
    it("should return true for admin", () => {
      expect(canViewAllUsers("admin")).toBe(true);
    });

    it("should return false for manager", () => {
      expect(canViewAllUsers("manager")).toBe(false);
    });

    it("should return false for member", () => {
      expect(canViewAllUsers("member")).toBe(false);
    });

    it("should return false for invalid roles", () => {
      expect(canViewAllUsers("invalid")).toBe(false);
      expect(canViewAllUsers("")).toBe(false);
    });
  });

  describe("canManageUsers", () => {
    it("should return true for admin", () => {
      expect(canManageUsers("admin")).toBe(true);
    });

    it("should return false for manager", () => {
      expect(canManageUsers("manager")).toBe(false);
    });

    it("should return false for member", () => {
      expect(canManageUsers("member")).toBe(false);
    });

    it("should return false for invalid roles", () => {
      expect(canManageUsers("invalid")).toBe(false);
      expect(canManageUsers("")).toBe(false);
    });
  });
});
