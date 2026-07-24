import { describe, it, expect } from 'vitest';
import { SessionManager } from '../legacy/session';
import { AxiosResponse } from 'axios';

describe('SessionManager authentication expiration detection', () => {
  const sessionManager = SessionManager.getInstance();

  it('detects status 401 as expired', () => {
    const res = { status: 401 } as AxiosResponse;
    expect(sessionManager.isAuthenticationExpired(res)).toBe(true);
  });

  it('detects status 403 as expired', () => {
    const res = { status: 403 } as AxiosResponse;
    expect(sessionManager.isAuthenticationExpired(res)).toBe(true);
  });

  it('detects 303 redirect to /login as expired', () => {
    const res = {
      status: 303,
      headers: { location: '/login' },
    } as unknown as AxiosResponse;
    expect(sessionManager.isAuthenticationExpired(res)).toBe(true);
  });

  it('does not flag normal 200 OK responses as expired', () => {
    const res = { status: 200, data: { data: [] } } as AxiosResponse;
    expect(sessionManager.isAuthenticationExpired(res)).toBe(false);
  });
});
