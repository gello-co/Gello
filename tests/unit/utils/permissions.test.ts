import { describe, expect, it } from 'vitest';
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
} from '../../../ProjectSourceCode/src/lib/utils/permissions';

describe('Permission Utilities', () => {
  describe('isAdmin', () => {
    it('returns true for admin', () => {
      expect(isAdmin('admin')).toBe(true);
    });

    it('returns false for other roles', () => {
      expect(isAdmin('manager')).toBe(false);
      expect(isAdmin('member')).toBe(false);
    });
  });

  describe('isManager', () => {
    it('returns true for manager', () => {
      expect(isManager('manager')).toBe(true);
    });

    it('returns false otherwise', () => {
      expect(isManager('admin')).toBe(false);
      expect(isManager('member')).toBe(false);
    });
  });

  describe('isMember', () => {
    it('returns true for member', () => {
      expect(isMember('member')).toBe(true);
    });

    it('returns false otherwise', () => {
      expect(isMember('admin')).toBe(false);
      expect(isMember('manager')).toBe(false);
    });
  });

  describe('canManageTeam', () => {
    it('allows admin', () => {
      expect(canManageTeam('admin')).toBe(true);
    });

    it('allows manager', () => {
      expect(canManageTeam('manager')).toBe(true);
    });

    it('rejects member', () => {
      expect(canManageTeam('member')).toBe(false);
    });
  });

  describe('canManageBoard', () => {
    it('allows admin and manager', () => {
      expect(canManageBoard('admin')).toBe(true);
      expect(canManageBoard('manager')).toBe(true);
    });

    it('rejects member', () => {
      expect(canManageBoard('member')).toBe(false);
    });
  });

  describe('canManageList', () => {
    it('allows admin and manager', () => {
      expect(canManageList('admin')).toBe(true);
      expect(canManageList('manager')).toBe(true);
    });

    it('rejects member', () => {
      expect(canManageList('member')).toBe(false);
    });
  });

  describe('canManageTask', () => {
    it('allows admin and manager', () => {
      expect(canManageTask('admin')).toBe(true);
      expect(canManageTask('manager')).toBe(true);
    });

    it('rejects member', () => {
      expect(canManageTask('member')).toBe(false);
    });
  });

  describe('canViewAllUsers', () => {
    it('only allows admin', () => {
      expect(canViewAllUsers('admin')).toBe(true);
      expect(canViewAllUsers('manager')).toBe(false);
      expect(canViewAllUsers('member')).toBe(false);
    });
  });

  describe('canManageUsers', () => {
    it('only allows admin', () => {
      expect(canManageUsers('admin')).toBe(true);
      expect(canManageUsers('manager')).toBe(false);
      expect(canManageUsers('member')).toBe(false);
    });
  });
});
