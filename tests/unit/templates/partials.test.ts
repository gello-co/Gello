/**
 * Template Tests using happy-dom
 *
 * These tests verify Handlebars partials render correctly using happy-dom
 * for DOM testing. This approach is simpler and more appropriate for
 * server-rendered HTML than using testing-library-dom (which is React-focused).
 *
 * Pattern:
 * 1. Compile Handlebars template with helpers
 * 2. Render HTML string with test data
 * 3. Parse HTML with happy-dom Window
 * 4. Query DOM using standard APIs (querySelector, querySelectorAll, textContent)
 */

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import Handlebars from 'handlebars';
import { Window } from 'happy-dom';
import { beforeAll, describe, expect, it } from 'vitest';
import { helpers } from '../../../ProjectSourceCode/src/express/helpers/handlebars.js';

// Path to views directory
const VIEWS_DIR = resolve(process.cwd(), 'ProjectSourceCode/src/express/views');

// Helper to load and compile a partial
function loadPartial(name: string): HandlebarsTemplateDelegate {
  const path = resolve(VIEWS_DIR, 'partials', `${name}.hbs`);
  const source = readFileSync(path, 'utf-8');
  return Handlebars.compile(source);
}

// Helper to parse HTML into DOM using happy-dom
function parseHTML(html: string): Document {
  const window = new Window({
    url: 'http://localhost',
  });
  window.document.body.innerHTML = html;
  return window.document as unknown as Document;
}

describe('Handlebars Partials', () => {
  beforeAll(() => {
    // Register all Handlebars helpers
    for (const [name, fn] of Object.entries(helpers)) {
      Handlebars.registerHelper(name, fn);
    }

    // Register user-avatar partial (referenced by task-card)
    const userAvatarSource = readFileSync(
      resolve(VIEWS_DIR, 'partials', 'user-avatar.hbs'),
      'utf-8'
    );
    Handlebars.registerPartial('user-avatar', userAvatarSource);
  });

  describe('empty-state partial', () => {
    it('should render with default values', () => {
      const template = loadPartial('empty-state');
      const html = template({});
      const doc = parseHTML(html);

      const container = doc.querySelector('.empty-state');
      expect(container).toBeTruthy();

      // Default icon should be inbox
      const icon = doc.querySelector('.bi-inbox');
      expect(icon).toBeTruthy();

      // Default title
      const title = doc.querySelector('h5');
      expect(title?.textContent).toBe('No items yet');
    });

    it('should render with custom icon and title', () => {
      const template = loadPartial('empty-state');
      const html = template({
        icon: 'clipboard-x',
        title: 'No tasks found',
      });
      const doc = parseHTML(html);

      const customIcon = doc.querySelector('.bi-clipboard-x');
      expect(customIcon).toBeTruthy();

      const title = doc.querySelector('h5');
      expect(title?.textContent).toBe('No tasks found');
    });

    it('should render with message', () => {
      const template = loadPartial('empty-state');
      const html = template({
        message: 'Create your first item to get started',
      });
      const doc = parseHTML(html);

      const message = doc.querySelector('p.text-muted');
      expect(message?.textContent).toBe('Create your first item to get started');
    });

    it('should render action button with URL', () => {
      const template = loadPartial('empty-state');
      const html = template({
        actionUrl: '/boards/new',
        actionText: 'Create Board',
        actionIcon: 'plus-circle',
      });
      const doc = parseHTML(html);

      const button = doc.querySelector('a.btn-primary');
      expect(button).toBeTruthy();
      expect(button?.getAttribute('href')).toBe('/boards/new');
      expect(button?.textContent).toContain('Create Board');

      const buttonIcon = button?.querySelector('.bi-plus-circle');
      expect(buttonIcon).toBeTruthy();
    });

    it('should render HTMX action button', () => {
      const template = loadPartial('empty-state');
      const html = template({
        actionHx: '/api/boards/create-form',
        actionText: 'New Board',
        actionTarget: '#modal-container',
      });
      const doc = parseHTML(html);

      const button = doc.querySelector('button.btn-primary');
      expect(button).toBeTruthy();
      expect(button?.getAttribute('hx-get')).toBe('/api/boards/create-form');
      expect(button?.getAttribute('hx-target')).toBe('#modal-container');
      expect(button?.textContent).toContain('New Board');
    });
  });

  describe('task-card partial', () => {
    const baseTask = {
      id: 'task-123',
      title: 'Implement feature',
      description: 'Add the new feature to the app',
      story_points: 5,
      assigned_to: null,
      due_date: null,
      completed_at: null,
    };

    const adminUser = {
      id: 'user-admin',
      role: 'admin',
    };

    const managerUser = {
      id: 'user-manager',
      role: 'manager',
    };

    const memberUser = {
      id: 'user-member',
      role: 'member',
    };

    it('should render task title and points', () => {
      const template = loadPartial('task-card');
      const html = template({ task: baseTask, user: memberUser });
      const doc = parseHTML(html);

      const title = doc.querySelector('.card-title');
      expect(title?.textContent).toBe('Implement feature');

      const pointsBadge = doc.querySelector('.badge.bg-secondary');
      expect(pointsBadge?.textContent).toBe('5 pts');
    });

    it('should render task description when present', () => {
      const template = loadPartial('task-card');
      const html = template({ task: baseTask, user: memberUser });
      const doc = parseHTML(html);

      const description = doc.querySelector('.card-text');
      expect(description?.textContent).toBe('Add the new feature to the app');
    });

    it('should not render description when absent', () => {
      const template = loadPartial('task-card');
      const taskWithoutDesc = { ...baseTask, description: null };
      const html = template({ task: taskWithoutDesc, user: memberUser });
      const doc = parseHTML(html);

      const description = doc.querySelector('.card-text');
      expect(description).toBeFalsy();
    });

    it('should show edit button for admin users', () => {
      const template = loadPartial('task-card');
      const html = template({ task: baseTask, user: adminUser });
      const doc = parseHTML(html);

      const editButton = doc.querySelector('[data-action="edit"]');
      expect(editButton).toBeTruthy();
    });

    it('should hide edit button for member users', () => {
      const template = loadPartial('task-card');
      const html = template({ task: baseTask, user: memberUser });
      const doc = parseHTML(html);

      const editButton = doc.querySelector('[data-action="edit"]');
      expect(editButton).toBeFalsy();
    });

    it('should show complete button for incomplete task when user can complete', () => {
      const template = loadPartial('task-card');
      // Member can complete task if assigned to them
      const assignedTask = { ...baseTask, assigned_to: memberUser.id };
      const html = template({ task: assignedTask, user: memberUser });
      const doc = parseHTML(html);

      const completeButton = doc.querySelector('button[hx-patch]');
      expect(completeButton).toBeTruthy();
      expect(completeButton?.getAttribute('hx-patch')).toBe('/api/tasks/task-123/complete');
      expect(completeButton?.textContent).toContain('Complete');
    });

    it('should show complete button for managers on any task', () => {
      const template = loadPartial('task-card');
      // Manager can complete any task (not just assigned)
      const html = template({ task: baseTask, user: managerUser });
      const doc = parseHTML(html);

      const completeButton = doc.querySelector('button[hx-patch]');
      expect(completeButton).toBeTruthy();
    });

    it('should show completed badge for completed task', () => {
      const template = loadPartial('task-card');
      const completedTask = {
        ...baseTask,
        completed_at: '2024-01-15T10:30:00Z',
      };
      const html = template({ task: completedTask, user: memberUser });
      const doc = parseHTML(html);

      const completedBadge = doc.querySelector('.badge.bg-success');
      expect(completedBadge).toBeTruthy();
      expect(completedBadge?.textContent).toContain('Completed');

      const completeButton = doc.querySelector('button[hx-patch]');
      expect(completeButton).toBeFalsy();
    });

    it('should have correct HTMX attributes for completion', () => {
      const template = loadPartial('task-card');
      const html = template({ task: baseTask, user: adminUser });
      const doc = parseHTML(html);

      const completeButton = doc.querySelector('button[hx-patch]');
      expect(completeButton?.getAttribute('hx-swap')).toBe('outerHTML');
      expect(completeButton?.getAttribute('hx-target')).toBe('closest .task-card');
      expect(completeButton?.getAttribute('hx-indicator')).toBe('#loading-task-123');
    });

    it('should have loading indicator element', () => {
      const template = loadPartial('task-card');
      const html = template({ task: baseTask, user: adminUser });
      const doc = parseHTML(html);

      const loadingIndicator = doc.querySelector('#loading-task-123');
      expect(loadingIndicator).toBeTruthy();
      expect(loadingIndicator?.classList.contains('htmx-indicator')).toBe(true);
      expect(loadingIndicator?.classList.contains('spinner-border')).toBe(true);
    });

    it('should set draggable attribute', () => {
      const template = loadPartial('task-card');
      const html = template({ task: baseTask, user: memberUser });
      const doc = parseHTML(html);

      const card = doc.querySelector('.task-card');
      expect(card?.getAttribute('draggable')).toBe('true');
      expect(card?.getAttribute('data-task-id')).toBe('task-123');
    });
  });

  describe('skeleton-card partial', () => {
    it('should render skeleton placeholder structure', () => {
      const template = loadPartial('skeleton-card');
      const html = template({});
      const doc = parseHTML(html);

      const card = doc.querySelector('.card');
      expect(card).toBeTruthy();

      // Should have placeholder elements
      const placeholders = doc.querySelectorAll('.placeholder');
      expect(placeholders.length).toBeGreaterThan(0);
    });
  });
});
