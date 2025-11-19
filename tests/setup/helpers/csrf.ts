/**
 * Provides utilities for retrieving tokens + merging cookies for requests.
 */

type CsrfResponse = {
  token: string;
  cookies: string[];
};

export async function getCsrfToken(
  cookies?: string[] | string,
): Promise<CsrfResponse> {
  const app = (await import("../../../ProjectSourceCode/src/server/app.js"))
    .app;
  const { default: request } = await import("supertest");

  let req = request(app).get("/api/csrf-token");

  // Accept either array or string (joined cookie header)
  // String format is preferred for supertest reliability
  if (cookies) {
    if (typeof cookies === "string") {
      req = req.set("Cookie", cookies);
    } else if (Array.isArray(cookies) && cookies.length > 0) {
      // Convert array to joined string for consistency
      req = req.set("Cookie", cookies.join("; "));
    }
  }
  
  const inputCookies = Array.isArray(cookies)
    ? cookies
    : cookies
      ? [cookies]
      : [];

  const response = await req;

  if (response.status === 404) {
    return {
      token: "",
      cookies: inputCookies,
    };
  }

  if (response.status === 429) {
    console.warn(
      "[tests][csrf] CSRF endpoint rate limited, proceeding without token.",
    );
    return {
      token: "",
      cookies: inputCookies,
    };
  }

  if (response.status !== 200) {
    throw new Error(
      `Failed to get CSRF token: ${response.status} - ${response.text}`,
    );
  }

  const csrfCookieHeader = response.headers["set-cookie"]?.[0];
  if (csrfCookieHeader) {
    const csrfCookie = csrfCookieHeader.split(";")[0];
    if (csrfCookie) {
      const filteredCookies = inputCookies.filter(
        (cookie) =>
          !cookie.startsWith("csrf=") && !cookie.startsWith("__Host-csrf="),
      );
      return {
        token: response.body.csrfToken || "",
        cookies: [...filteredCookies, csrfCookie],
      };
    }
  }

  return {
    token: response.body.csrfToken || "",
    cookies: inputCookies,
  };
}

export function setCsrfHeadersIfEnabled<
  T extends { set: (key: string, value: string) => T },
>(req: T, csrfToken: string, csrfCookie?: string): T {
  if (csrfToken) {
    req = req.set("X-CSRF-Token", csrfToken);
  }
  if (csrfCookie) {
    req = req.set("Cookie", csrfCookie);
  }
  return req;
}
