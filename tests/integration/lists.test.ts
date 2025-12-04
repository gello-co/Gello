/**
 * Integration tests for lists API
 * Tests CRUD operations and list reordering
 */

import request from 'supertest';
import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { app } from '../../ProjectSourceCode/src/express/app.js';
import {
  createTestUser,
  generateTestEmail,
  getCsrfToken,
  loginAsUser,
  prepareTestDb,
  setCsrfHeadersIfEnabled,
} from '../setup/helpers/index.js';

describe('Lists API', () => {
  let managerCookies: string = '';
  let memberCookies: string = '';
  let managerEmail: string;
  let memberEmail: string;
  let memberId: string;
  let teamId: string;
  let boardId: string;

  beforeAll(async () => {
    await prepareTestDb();

    managerEmail = generateTestEmail('manager');
    memberEmail = generateTestEmail('member');

    await createTestUser(managerEmail, 'password123', 'manager', 'Manager User');
    const member = await createTestUser(memberEmail, 'password123', 'member', 'Member User');
    memberId = member.user.id;

    const { cookieHeader: managerCookieHeader } = await loginAsUser(managerEmail, 'password123');
    managerCookies = managerCookieHeader;

    const { cookieHeader: memberCookieHeader } = await loginAsUser(memberEmail, 'password123');
    memberCookies = memberCookieHeader;

    // Create team and board for lists
    const { token: csrfToken } = await getCsrfToken(managerCookies);
    let req = request(app).post('/api/teams').set('Cookie', managerCookies);
    req = setCsrfHeadersIfEnabled(req, csrfToken);
    const teamResponse = await req.send({ name: 'Test Team' });

    // Assert team creation succeeded
    if (teamResponse.status !== 201) {
      console.error('Team creation failed:', {
        status: teamResponse.status,
        body: teamResponse.body,
        text: teamResponse.text?.slice(0, 200),
      });
    }
    expect(teamResponse.status).toBe(201);
    expect(teamResponse.body).toHaveProperty('id');
    teamId = teamResponse.body.id;

    // Add member to team so RLS allows them to access team resources
    const { token: memberCsrfToken } = await getCsrfToken(managerCookies);
    await request(app)
      .post(`/api/teams/${teamId}/members`)
      .set('Cookie', managerCookies)
      .set('X-CSRF-Token', memberCsrfToken)
      .send({ user_id: memberId });

    const { token: boardCsrfToken } = await getCsrfToken(managerCookies);
    let boardReq = request(app).post('/api/boards').set('Cookie', managerCookies);
    boardReq = setCsrfHeadersIfEnabled(boardReq, boardCsrfToken);
    const boardResponse = await boardReq.send({
      name: 'Test Board',
      team_id: teamId,
    });

    // Assert board creation succeeded
    expect(boardResponse.status).toBe(201);
    expect(boardResponse.body).toHaveProperty('id');
    boardId = boardResponse.body.id;
  });

  describe('GET /api/lists?board_id=:boardId', () => {
    it('should return lists for a board', async () => {
      const response = await request(app)
        .get(`/api/lists?board_id=${boardId}`)
        .set('Cookie', memberCookies);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
    });

    it('should require authentication', async () => {
      const response = await request(app).get(`/api/lists?board_id=${boardId}`);

      expect(response.status).toBe(401);
    });
  });

  describe('POST /api/lists', () => {
    it('should create list as manager', async () => {
      const { token: csrfToken } = await getCsrfToken(managerCookies);
      let req = request(app).post('/api/lists').set('Cookie', managerCookies);
      req = setCsrfHeadersIfEnabled(req, csrfToken);
      const response = await req.send({
        name: 'New List',
        board_id: boardId,
        position: 0,
      });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('name', 'New List');
      expect(response.body).toHaveProperty('board_id', boardId);
    });

    it('should reject list creation by member', async () => {
      const { token: csrfToken } = await getCsrfToken(memberCookies);
      let req = request(app).post('/api/lists').set('Cookie', memberCookies);
      req = setCsrfHeadersIfEnabled(req, csrfToken);
      const response = await req.send({
        name: 'Member List',
        board_id: boardId,
      });

      expect(response.status).toBe(403);
    });

    it('should validate required fields', async () => {
      const { token: csrfToken } = await getCsrfToken(managerCookies);
      let req = request(app).post('/api/lists').set('Cookie', managerCookies);
      req = setCsrfHeadersIfEnabled(req, csrfToken);
      const response = await req.send({});

      expect(response.status).toBe(400);
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .post('/api/lists')
        .send({ name: 'Unauthorized List', board_id: boardId });

      expect(response.status).toBe(401);
    });
  });

  describe('GET /api/lists/:id', () => {
    let listId: string;

    beforeEach(async () => {
      const { token: csrfToken } = await getCsrfToken(managerCookies);
      let req = request(app).post('/api/lists').set('Cookie', managerCookies);
      req = setCsrfHeadersIfEnabled(req, csrfToken);
      const createResponse = await req.send({
        name: 'Test List',
        board_id: boardId,
      });

      listId = createResponse.body.id;
    });

    it('should return list by id', async () => {
      const response = await request(app).get(`/api/lists/${listId}`).set('Cookie', memberCookies);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('id', listId);
      expect(response.body).toHaveProperty('name', 'Test List');
    });

    it('should return 404 for non-existent list', async () => {
      const response = await request(app)
        .get('/api/lists/00000000-0000-0000-0000-000000000000')
        .set('Cookie', memberCookies);

      expect(response.status).toBe(404);
    });

    it('should require authentication', async () => {
      const response = await request(app).get(`/api/lists/${listId}`);

      expect(response.status).toBe(401);
    });
  });

  describe('PUT /api/lists/:id', () => {
    let listId: string;

    beforeEach(async () => {
      const { token: csrfToken } = await getCsrfToken(managerCookies);
      let req = request(app).post('/api/lists').set('Cookie', managerCookies);
      req = setCsrfHeadersIfEnabled(req, csrfToken);
      const createResponse = await req.send({
        name: 'Original List',
        board_id: boardId,
      });

      listId = createResponse.body.id;
    });

    it('should update list as manager', async () => {
      const { token: csrfToken } = await getCsrfToken(managerCookies);
      let req = request(app).put(`/api/lists/${listId}`).set('Cookie', managerCookies);
      req = setCsrfHeadersIfEnabled(req, csrfToken);
      const response = await req.send({
        name: 'Updated List',
      });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('name', 'Updated List');
    });

    it('should reject update by member', async () => {
      const { token: csrfToken } = await getCsrfToken(memberCookies);
      let req = request(app).put(`/api/lists/${listId}`).set('Cookie', memberCookies);
      req = setCsrfHeadersIfEnabled(req, csrfToken);
      const response = await req.send({ name: 'Hacked List' });

      expect(response.status).toBe(403);
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .put(`/api/lists/${listId}`)
        .send({ name: 'Unauthorized Update' });

      expect(response.status).toBe(401);
    });
  });

  describe('PATCH /api/lists/:id/reorder', () => {
    let listId1: string;
    let listId2: string;

    beforeEach(async () => {
      const { token: csrfToken } = await getCsrfToken(managerCookies);
      let req = request(app).post('/api/lists').set('Cookie', managerCookies);
      req = setCsrfHeadersIfEnabled(req, csrfToken);
      const list1 = await req.send({
        name: 'List 1',
        board_id: boardId,
        position: 0,
      });

      const { token: list2CsrfToken } = await getCsrfToken(managerCookies);
      let list2Req = request(app).post('/api/lists').set('Cookie', managerCookies);
      list2Req = setCsrfHeadersIfEnabled(list2Req, list2CsrfToken);
      const list2 = await list2Req.send({
        name: 'List 2',
        board_id: boardId,
        position: 1,
      });

      listId1 = list1.body.id;
      listId2 = list2.body.id;
    });

    it('should reorder lists as manager', async () => {
      const { token: csrfToken } = await getCsrfToken(managerCookies);
      let req = request(app).patch(`/api/lists/${listId1}/reorder`).set('Cookie', managerCookies);
      req = setCsrfHeadersIfEnabled(req, csrfToken);
      const response = await req.send({
        board_id: boardId,
        list_positions: [
          { id: listId2, position: 0 },
          { id: listId1, position: 1 },
        ],
      });

      expect(response.status).toBe(204);
    });

    it('should reject reorder by member', async () => {
      const { token: csrfToken } = await getCsrfToken(memberCookies);
      let req = request(app).patch(`/api/lists/${listId1}/reorder`).set('Cookie', memberCookies);
      req = setCsrfHeadersIfEnabled(req, csrfToken);
      const response = await req.send({
        board_id: boardId,
        list_positions: [{ id: listId1, position: 0 }],
      });

      expect(response.status).toBe(403);
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .patch(`/api/lists/${listId1}/reorder`)
        .send({
          board_id: boardId,
          list_positions: [{ id: listId1, position: 0 }],
        });

      expect(response.status).toBe(401);
    });

    it('should reject invalid list IDs that do not belong to board', async () => {
      const { token: csrfToken } = await getCsrfToken(managerCookies);
      let req = request(app).patch(`/api/lists/${listId1}/reorder`).set('Cookie', managerCookies);
      req = setCsrfHeadersIfEnabled(req, csrfToken);
      const response = await req.send({
        board_id: boardId,
        list_positions: [
          { id: listId1, position: 0 },
          { id: '00000000-0000-0000-0000-000000000000', position: 1 },
        ],
      });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Validation error');
      expect(response.body.message).toContain('Invalid or missing list IDs');
    });
  });

  describe('DELETE /api/lists/:id', () => {
    let listId: string;

    beforeEach(async () => {
      const { token: csrfToken } = await getCsrfToken(managerCookies);
      let req = request(app).post('/api/lists').set('Cookie', managerCookies);
      req = setCsrfHeadersIfEnabled(req, csrfToken);
      const createResponse = await req.send({
        name: 'List to Delete',
        board_id: boardId,
      });

      listId = createResponse.body.id;
    });

    it('should delete list as manager', async () => {
      const { token: csrfToken } = await getCsrfToken(managerCookies);
      let req = request(app).delete(`/api/lists/${listId}`).set('Cookie', managerCookies);
      req = setCsrfHeadersIfEnabled(req, csrfToken);
      const response = await req;

      expect(response.status).toBe(204);
    });

    it('should reject delete by member', async () => {
      const { token: csrfToken } = await getCsrfToken(memberCookies);
      let req = request(app).delete(`/api/lists/${listId}`).set('Cookie', memberCookies);
      req = setCsrfHeadersIfEnabled(req, csrfToken);
      const response = await req;

      expect(response.status).toBe(403);
    });

    it('should require authentication', async () => {
      const response = await request(app).delete(`/api/lists/${listId}`);

      expect(response.status).toBe(401);
    });
  });
});
