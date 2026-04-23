import type { APIRequestContext, Page } from '@playwright/test';

/**
 * Register a fresh test user via the public auth API and return the JWT.
 * Username/email are unique per call so tests can be re-run safely.
 */
export async function registerTestUser(
  request: APIRequestContext,
  prefix = 'tst',
): Promise<{ token: string; username: string; email: string }> {
  const suf = Math.random().toString(36).slice(2, 10);
  const username = `${prefix}${suf}`;
  const email = `${prefix}${suf}@e2e.local`;
  const password = 'Test1234!';

  const res = await request.post('/api/auth/register', {
    data: { username, email, password },
  });
  if (!res.ok()) {
    throw new Error(`register failed: ${res.status()} ${await res.text()}`);
  }
  const body = await res.json();
  if (!body?.token) throw new Error(`register response missing token: ${JSON.stringify(body)}`);
  return { token: body.token as string, username, email };
}

/**
 * Inject the auth token into localStorage before any app code runs so the SPA
 * boots already-authenticated and skips the welcome/login modal.
 */
export async function authenticatePage(page: Page, token: string): Promise<void> {
  await page.addInitScript((t: string) => {
    window.localStorage.setItem('pcasino_token', t);
  }, token);
}
