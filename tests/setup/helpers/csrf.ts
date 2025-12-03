/**
 * Provides utilities for retrieving tokens + merging cookies for requests.
 */

type CsrfResponse = {
  token: string;
  cookies: Array<string>;
};

function normalizeCookies(cookies?: Array<string> | string): Array<string> {
  if (!cookies) return [];
  return Array.isArray(cookies) ? cookies : [cookies];
}

function buildCookieHeader(cookies?: Array<string> | string): string | null {
  if (!cookies) return null;
  if (typeof cookies === 'string') return cookies;
  if (Array.isArray(cookies) && cookies.length > 0) return cookies.join('; ');
  return null;
}

function handleNonSuccessResponse(
  status: number,
  inputCookies: Array<string>,
  responseText?: string
): CsrfResponse {
  if (status === 404 || status === 429) {
    if (status === 429) {
      console.warn('[tests][csrf] CSRF endpoint rate limited, proceeding without token.');
    }
    return { token: '', cookies: inputCookies };
  }
  throw new Error(`Failed to get CSRF token: ${status} - ${responseText}`);
}

function extractCsrfFromResponse(
  response: { headers: Record<string, unknown>; body: { csrfToken?: string } },
  inputCookies: Array<string>
): CsrfResponse {
  const setCookieHeader = response.headers['set-cookie'] as Array<string> | undefined;
  const csrfCookieHeader = setCookieHeader?.[0];
  const csrfCookie = csrfCookieHeader?.split(';')[0];

  if (csrfCookie) {
    const filteredCookies = inputCookies.filter(
      (cookie) => !(cookie.startsWith('csrf=') || cookie.startsWith('__Host-csrf='))
    );
    return {
      token: response.body.csrfToken || '',
      cookies: [...filteredCookies, csrfCookie],
    };
  }

  return {
    token: response.body.csrfToken || '',
    cookies: inputCookies,
  };
}

export async function getCsrfToken(cookies?: Array<string> | string): Promise<CsrfResponse> {
  const app = (await import('../../../ProjectSourceCode/src/express/app.js')).app;
  const { default: request } = await import('supertest');

  let req = request(app).get('/api/csrf-token');

  const cookieHeader = buildCookieHeader(cookies);
  if (cookieHeader) {
    req = req.set('Cookie', cookieHeader);
  }

  const inputCookies = normalizeCookies(cookies);
  const response = await req;

  if (response.status !== 200) {
    return handleNonSuccessResponse(response.status, inputCookies, response.text);
  }

  return extractCsrfFromResponse(response, inputCookies);
}

export function setCsrfHeadersIfEnabled<T extends { set: (key: string, value: string) => T }>(
  req: T,
  csrfToken: string,
  csrfCookie?: string
): T {
  if (csrfToken) {
    req = req.set('X-CSRF-Token', csrfToken);
  }
  if (csrfCookie) {
    req = req.set('Cookie', csrfCookie);
  }
  return req;
}
