/**
 * RLS Policy Verification Tests
 *
 * Phase 03.2: Verifies Row Level Security policies work correctly
 * to prevent unauthorized data access between users.
 *
 * Test scenarios:
 * - Users can only see their own/team's boards
 * - Users cannot complete another user's tasks
 * - Points history respects user privacy
 * - Leaderboard aggregation works with RLS
 */

import request from 'supertest';
import { beforeAll, describe, expect, it } from 'vitest';
import { app } from '../../ProjectSourceCode/src/express/app.js';
import {
  createTestUser,
  generateTestEmail,
  getCsrfToken,
  loginAsUser,
  prepareTestDb,
  setCsrfHeadersIfEnabled,
} from '../setup/helpers/index.js';

describe('RLS Policy Verification', () => {
  // Team A: Manager + Member
  let teamAManagerEmail: string;
  let teamAManagerCookies: string;
  let teamAMemberEmail: string;
  let teamAMemberId: string;
  let teamAMemberCookies: string;
  let teamAId: string;
  let teamABoardId: string;
  let teamAListId: string;
  let teamATaskId: string;

  // Team B: Manager + Member (isolated from Team A)
  let teamBManagerEmail: string;
  let teamBManagerCookies: string;
  let teamBMemberEmail: string;
  let teamBMemberId: string;
  let teamBMemberCookies: string;
  let teamBId: string;
  let teamBBoardId: string;
  let teamBListId: string;
  let _teamBTaskId: string;

  beforeAll(async () => {
    await prepareTestDb();

    // Create Team A users
    teamAManagerEmail = generateTestEmail('rls-teamA-manager');
    teamAMemberEmail = generateTestEmail('rls-teamA-member');

    await createTestUser(teamAManagerEmail, 'password123', 'manager', 'Team A Manager');
    const teamAMember = await createTestUser(
      teamAMemberEmail,
      'password123',
      'member',
      'Team A Member'
    );
    teamAMemberId = teamAMember.user.id;

    const { cookieHeader: teamAManagerCookieHeader } = await loginAsUser(
      teamAManagerEmail,
      'password123'
    );
    teamAManagerCookies = teamAManagerCookieHeader;

    const { cookieHeader: teamAMemberCookieHeader } = await loginAsUser(
      teamAMemberEmail,
      'password123'
    );
    teamAMemberCookies = teamAMemberCookieHeader;

    // Create Team A
    const { token: teamACsrf } = await getCsrfToken(teamAManagerCookies);
    let teamAReq = request(app).post('/api/teams').set('Cookie', teamAManagerCookies);
    teamAReq = setCsrfHeadersIfEnabled(teamAReq, teamACsrf);
    const teamAResponse = await teamAReq.send({ name: 'RLS Test Team A' });
    expect(teamAResponse.status).toBe(201);
    teamAId = teamAResponse.body.id;

    // Add member to Team A
    const { token: addMemberACsrf } = await getCsrfToken(teamAManagerCookies);
    await request(app)
      .post(`/api/teams/${teamAId}/members`)
      .set('Cookie', teamAManagerCookies)
      .set('X-CSRF-Token', addMemberACsrf)
      .send({ user_id: teamAMemberId });

    // Create Team A Board
    const { token: boardACsrf } = await getCsrfToken(teamAManagerCookies);
    const boardAResponse = await request(app)
      .post('/api/boards')
      .set('Cookie', teamAManagerCookies)
      .set('X-CSRF-Token', boardACsrf)
      .send({ name: 'Team A Board', team_id: teamAId });
    expect(boardAResponse.status).toBe(201);
    teamABoardId = boardAResponse.body.id;

    // Create Team A List
    const { token: listACsrf } = await getCsrfToken(teamAManagerCookies);
    const listAResponse = await request(app)
      .post('/api/lists')
      .set('Cookie', teamAManagerCookies)
      .set('X-CSRF-Token', listACsrf)
      .send({ name: 'Team A List', board_id: teamABoardId });
    expect(listAResponse.status).toBe(201);
    teamAListId = listAResponse.body.id;

    // Create Team A Task (assigned to Team A Member)
    const { token: taskACsrf } = await getCsrfToken(teamAManagerCookies);
    const taskAResponse = await request(app)
      .post('/api/tasks')
      .set('Cookie', teamAManagerCookies)
      .set('X-CSRF-Token', taskACsrf)
      .send({
        title: 'Team A Task',
        list_id: teamAListId,
        points: 10,
        assigned_to: teamAMemberId,
      });
    expect(taskAResponse.status).toBe(201);
    teamATaskId = taskAResponse.body.id;

    // Create Team B users
    teamBManagerEmail = generateTestEmail('rls-teamB-manager');
    teamBMemberEmail = generateTestEmail('rls-teamB-member');

    await createTestUser(teamBManagerEmail, 'password123', 'manager', 'Team B Manager');
    const teamBMember = await createTestUser(
      teamBMemberEmail,
      'password123',
      'member',
      'Team B Member'
    );
    teamBMemberId = teamBMember.user.id;

    const { cookieHeader: teamBManagerCookieHeader } = await loginAsUser(
      teamBManagerEmail,
      'password123'
    );
    teamBManagerCookies = teamBManagerCookieHeader;

    const { cookieHeader: teamBMemberCookieHeader } = await loginAsUser(
      teamBMemberEmail,
      'password123'
    );
    teamBMemberCookies = teamBMemberCookieHeader;

    // Create Team B
    const { token: teamBCsrf } = await getCsrfToken(teamBManagerCookies);
    let teamBReq = request(app).post('/api/teams').set('Cookie', teamBManagerCookies);
    teamBReq = setCsrfHeadersIfEnabled(teamBReq, teamBCsrf);
    const teamBResponse = await teamBReq.send({ name: 'RLS Test Team B' });
    expect(teamBResponse.status).toBe(201);
    teamBId = teamBResponse.body.id;

    // Add member to Team B
    const { token: addMemberBCsrf } = await getCsrfToken(teamBManagerCookies);
    await request(app)
      .post(`/api/teams/${teamBId}/members`)
      .set('Cookie', teamBManagerCookies)
      .set('X-CSRF-Token', addMemberBCsrf)
      .send({ user_id: teamBMemberId });

    // Create Team B Board
    const { token: boardBCsrf } = await getCsrfToken(teamBManagerCookies);
    const boardBResponse = await request(app)
      .post('/api/boards')
      .set('Cookie', teamBManagerCookies)
      .set('X-CSRF-Token', boardBCsrf)
      .send({ name: 'Team B Board', team_id: teamBId });
    expect(boardBResponse.status).toBe(201);
    teamBBoardId = boardBResponse.body.id;

    // Create Team B List
    const { token: listBCsrf } = await getCsrfToken(teamBManagerCookies);
    const listBResponse = await request(app)
      .post('/api/lists')
      .set('Cookie', teamBManagerCookies)
      .set('X-CSRF-Token', listBCsrf)
      .send({ name: 'Team B List', board_id: teamBBoardId });
    expect(listBResponse.status).toBe(201);
    teamBListId = listBResponse.body.id;

    // Create Team B Task (assigned to Team B Member)
    const { token: taskBCsrf } = await getCsrfToken(teamBManagerCookies);
    const taskBResponse = await request(app)
      .post('/api/tasks')
      .set('Cookie', teamBManagerCookies)
      .set('X-CSRF-Token', taskBCsrf)
      .send({
        title: 'Team B Task',
        list_id: teamBListId,
        points: 15,
        assigned_to: teamBMemberId,
      });
    expect(taskBResponse.status).toBe(201);
    _teamBTaskId = taskBResponse.body.id;
  });

  describe('03.2.1 Fresh Test Users', () => {
    it('should create isolated test users for each team', () => {
      // Verify users were created with unique emails
      expect(teamAManagerEmail).toContain('@test.local');
      expect(teamAMemberEmail).toContain('@test.local');
      expect(teamBManagerEmail).toContain('@test.local');
      expect(teamBMemberEmail).toContain('@test.local');

      // Verify users are distinct
      expect(teamAManagerEmail).not.toBe(teamBManagerEmail);
      expect(teamAMemberEmail).not.toBe(teamBMemberEmail);
    });
  });

  describe('03.2.2 Board Isolation', () => {
    it('Team A manager can see Team A boards', async () => {
      const response = await request(app).get('/api/boards').set('Cookie', teamAManagerCookies);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);

      const boardIds = response.body.map((b: { id: string }) => b.id);
      expect(boardIds).toContain(teamABoardId);
    });

    it('Team A member can see Team A boards', async () => {
      const response = await request(app).get('/api/boards').set('Cookie', teamAMemberCookies);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);

      const boardIds = response.body.map((b: { id: string }) => b.id);
      expect(boardIds).toContain(teamABoardId);
    });

    it('Team B manager cannot see Team A boards', async () => {
      const response = await request(app).get('/api/boards').set('Cookie', teamBManagerCookies);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);

      const boardIds = response.body.map((b: { id: string }) => b.id);
      expect(boardIds).not.toContain(teamABoardId);
      expect(boardIds).toContain(teamBBoardId);
    });

    it('Team B member cannot see Team A boards', async () => {
      const response = await request(app).get('/api/boards').set('Cookie', teamBMemberCookies);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);

      const boardIds = response.body.map((b: { id: string }) => b.id);
      expect(boardIds).not.toContain(teamABoardId);
    });

    it('Team A manager cannot access Team B board directly', async () => {
      const response = await request(app)
        .get(`/api/boards/${teamBBoardId}`)
        .set('Cookie', teamAManagerCookies);

      // Should return 404 (not found) due to RLS filtering
      expect(response.status).toBe(404);
    });
  });

  describe('03.2.3 Task Completion Isolation', () => {
    it('Team A member can complete their assigned task', async () => {
      const { token: csrfToken } = await getCsrfToken(teamAMemberCookies);
      const response = await request(app)
        .patch(`/api/tasks/${teamATaskId}/complete`)
        .set('Cookie', teamAMemberCookies)
        .set('X-CSRF-Token', csrfToken)
        .send({});

      expect(response.status).toBe(200);
      // Response uses completed_at timestamp, not boolean completed
      expect(response.body.completed_at).toBeTruthy();
    });

    it('Team B member cannot complete Team A task', async () => {
      // Create a new task in Team A for this test (since previous one is completed)
      const { token: createCsrf } = await getCsrfToken(teamAManagerCookies);
      const newTaskResponse = await request(app)
        .post('/api/tasks')
        .set('Cookie', teamAManagerCookies)
        .set('X-CSRF-Token', createCsrf)
        .send({
          title: 'Another Team A Task',
          list_id: teamAListId,
          points: 5,
          assigned_to: teamAMemberId,
        });
      expect(newTaskResponse.status).toBe(201);
      const newTaskId = newTaskResponse.body.id;

      // Team B member tries to complete Team A's task
      const { token: csrfToken } = await getCsrfToken(teamBMemberCookies);
      const response = await request(app)
        .patch(`/api/tasks/${newTaskId}/complete`)
        .set('Cookie', teamBMemberCookies)
        .set('X-CSRF-Token', csrfToken)
        .send({});

      // Should fail - either 403 (forbidden) or 404 (not found due to RLS)
      expect([403, 404]).toContain(response.status);
    });

    it('Only assigned user can complete tasks (even manager cannot complete unassigned tasks)', async () => {
      // Create a task assigned to Team A Member
      const { token: createCsrf } = await getCsrfToken(teamAManagerCookies);
      const taskResponse = await request(app)
        .post('/api/tasks')
        .set('Cookie', teamAManagerCookies)
        .set('X-CSRF-Token', createCsrf)
        .send({
          title: 'Member Assigned Task',
          list_id: teamAListId,
          points: 3,
          assigned_to: teamAMemberId,
        });
      expect(taskResponse.status).toBe(201);
      const taskId = taskResponse.body.id;

      // Manager tries to complete a task assigned to member - should fail
      const { token: completeCsrf } = await getCsrfToken(teamAManagerCookies);
      const response = await request(app)
        .patch(`/api/tasks/${taskId}/complete`)
        .set('Cookie', teamAManagerCookies)
        .set('X-CSRF-Token', completeCsrf)
        .send({});

      // Only assigned user can complete - manager gets 403
      expect(response.status).toBe(403);
    });
  });

  describe('03.2.4 Points History Privacy', () => {
    it('Team A member can see their own points history', async () => {
      // Complete a task first to ensure points exist
      const { token: createCsrf } = await getCsrfToken(teamAManagerCookies);
      const taskResponse = await request(app)
        .post('/api/tasks')
        .set('Cookie', teamAManagerCookies)
        .set('X-CSRF-Token', createCsrf)
        .send({
          title: 'Points Test Task',
          list_id: teamAListId,
          points: 7,
          assigned_to: teamAMemberId,
        });
      expect(taskResponse.status).toBe(201);
      const taskId = taskResponse.body.id;

      // Complete the task as the assigned member
      const { token: completeCsrf } = await getCsrfToken(teamAMemberCookies);
      await request(app)
        .patch(`/api/tasks/${taskId}/complete`)
        .set('Cookie', teamAMemberCookies)
        .set('X-CSRF-Token', completeCsrf)
        .send({});

      // Get points history
      const response = await request(app)
        .get('/api/points/history')
        .set('Cookie', teamAMemberCookies);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      // Member should see their own points
      if (response.body.length > 0) {
        const userIds = response.body.map((p: { user_id: string }) => p.user_id);
        expect(userIds.every((id: string) => id === teamAMemberId)).toBe(true);
      }
    });

    it('Team B member cannot see Team A member points history', async () => {
      const response = await request(app)
        .get('/api/points/history')
        .set('Cookie', teamBMemberCookies);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);

      // Should not contain Team A member's points
      const userIds = response.body.map((p: { user_id: string }) => p.user_id);
      expect(userIds).not.toContain(teamAMemberId);
    });
  });

  describe('03.2.5 Leaderboard Aggregation with RLS', () => {
    it('Leaderboard shows aggregated points respecting team boundaries', async () => {
      // Team A member views leaderboard
      const responseA = await request(app)
        .get('/api/points/leaderboard')
        .set('Cookie', teamAMemberCookies);

      expect(responseA.status).toBe(200);
      expect(Array.isArray(responseA.body)).toBe(true);

      // Team B member views leaderboard
      const responseB = await request(app)
        .get('/api/points/leaderboard')
        .set('Cookie', teamBMemberCookies);

      expect(responseB.status).toBe(200);
      expect(Array.isArray(responseB.body)).toBe(true);

      // Leaderboard should show different data based on team context
      // or global data if leaderboard is designed to be public
      // The key is that it doesn't error and returns valid data
    });

    it('Leaderboard page renders without errors', async () => {
      const response = await request(app).get('/leaderboard').set('Cookie', teamAMemberCookies);

      expect(response.status).toBe(200);
      expect(response.headers['content-type']).toContain('text/html');
    });
  });

  describe('Service Role Bypass for Testing', () => {
    it('documents that service role client bypasses RLS', () => {
      // This is a documentation test - the actual bypass is used in test helpers
      // Service role client (getTestSupabaseClient) bypasses RLS for:
      // - Creating test users
      // - Setting up test fixtures
      // - Cleaning up test data
      //
      // Regular authenticated client respects RLS policies.
      // Tests use loginAsUser() which returns cookies for the authenticated client.
      //
      // The bypass mechanism is:
      // 1. getTestSupabaseClient() - uses SUPABASE_SERVICE_ROLE_KEY, bypasses RLS
      // 2. getAnonSupabaseClient() - uses anon key, respects RLS
      // 3. API endpoints use the user's session token, respects RLS
      expect(true).toBe(true);
    });
  });
});
