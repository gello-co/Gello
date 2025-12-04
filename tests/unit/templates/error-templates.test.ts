/**
 * Unit tests for error templates
 * Tests 404 and 500 error page rendering
 */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { compile } from 'handlebars';
import type { Window } from 'happy-dom';
import { beforeAll, describe, expect, it } from 'vitest';

describe('Error Templates', () => {
  let window: Window;
  // Use happy-dom's Document type via the window instance
  let document: Window['document'];

  beforeAll(async () => {
    const { Window } = await import('happy-dom');
    window = new Window();
    document = window.document;
  });

  describe('404 Error Template', () => {
    it('should render 404 page with default message', () => {
      const templatePath = join(
        process.cwd(),
        'ProjectSourceCode/src/express/views/errors/404.hbs'
      );
      const templateSource = readFileSync(templatePath, 'utf-8');
      const template = compile(templateSource);

      const html = template({});
      document.body.innerHTML = html;

      const heading = document.querySelector('h1');
      expect(heading?.textContent).toContain('404');
      expect(heading?.textContent).toContain('Not Found');

      const message = document.querySelector('p.lead');
      expect(message?.textContent).toContain("doesn't exist");
    });

    it('should render 404 page with custom message', () => {
      const templatePath = join(
        process.cwd(),
        'ProjectSourceCode/src/express/views/errors/404.hbs'
      );
      const templateSource = readFileSync(templatePath, 'utf-8');
      const template = compile(templateSource);

      const customMessage = 'This specific resource was not found';
      const html = template({ message: customMessage });
      document.body.innerHTML = html;

      const message = document.querySelector('p.lead');
      expect(message?.textContent).toContain(customMessage);
    });

    it('should have navigation links', () => {
      const templatePath = join(
        process.cwd(),
        'ProjectSourceCode/src/express/views/errors/404.hbs'
      );
      const templateSource = readFileSync(templatePath, 'utf-8');
      const template = compile(templateSource);

      const html = template({});
      document.body.innerHTML = html;

      const homeLink = document.querySelector('a[href="/"]');
      expect(homeLink).toBeTruthy();
      expect(homeLink?.textContent).toContain('Home');

      const boardsLink = document.querySelector('a[href="/boards"]');
      expect(boardsLink).toBeTruthy();
    });
  });

  describe('500 Error Template', () => {
    it('should render 500 page with default message', () => {
      const templatePath = join(
        process.cwd(),
        'ProjectSourceCode/src/express/views/errors/error.hbs'
      );
      const templateSource = readFileSync(templatePath, 'utf-8');
      const template = compile(templateSource);

      const html = template({});
      document.body.innerHTML = html;

      const heading = document.querySelector('h1');
      expect(heading?.textContent).toContain('500');
      expect(heading?.textContent).toContain('Error');
    });

    it('should render 500 page with custom error message', () => {
      const templatePath = join(
        process.cwd(),
        'ProjectSourceCode/src/express/views/errors/error.hbs'
      );
      const templateSource = readFileSync(templatePath, 'utf-8');
      const template = compile(templateSource);

      const errorMessage = 'Database connection failed';
      const html = template({ error: errorMessage });
      document.body.innerHTML = html;

      expect(document.body.textContent).toContain(errorMessage);
    });

    it('should not show stack trace in production', () => {
      const templatePath = join(
        process.cwd(),
        'ProjectSourceCode/src/express/views/errors/error.hbs'
      );
      const templateSource = readFileSync(templatePath, 'utf-8');
      const template = compile(templateSource);

      const html = template({
        error: 'Test error',
        // No stack trace provided (production mode)
      });
      document.body.innerHTML = html;

      // Should not contain stack trace section
      expect(document.body.textContent).not.toContain('Stack Trace');
    });
  });
});
