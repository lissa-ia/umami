import { afterEach, beforeEach, describe, expect, test } from 'vitest';
import { getContentSecurityPolicy } from './csp';

const originalEnv = {
  API_URL: process.env.API_URL,
  ALLOWED_FRAME_URLS: process.env.ALLOWED_FRAME_URLS,
};

function setEnv(name: string, value: string | undefined) {
  if (value === undefined) {
    delete process.env[name];
  } else {
    process.env[name] = value;
  }
}

describe('getContentSecurityPolicy', () => {
  beforeEach(() => {
    setEnv('API_URL', undefined);
    setEnv('ALLOWED_FRAME_URLS', undefined);
  });

  afterEach(() => {
    setEnv('API_URL', originalEnv.API_URL);
    setEnv('ALLOWED_FRAME_URLS', originalEnv.ALLOWED_FRAME_URLS);
  });

  test('adds the API_URL origin to connect-src', () => {
    process.env.API_URL = 'https://api.example.com/api';

    expect(getContentSecurityPolicy()).toContain(
      "connect-src 'self' https: https://api.example.com;",
    );
  });

  test('uses the API_URL origin, not the full url', () => {
    process.env.API_URL = 'https://api.example.com/api';

    expect(getContentSecurityPolicy()).not.toContain('https://api.example.com/api');
  });

  test('drops an invalid API_URL from connect-src', () => {
    process.env.API_URL = 'not a url';

    const policy = getContentSecurityPolicy();

    expect(policy).toContain("connect-src 'self' https:;");
    expect(policy).not.toContain('undefined');
  });

  test('drops an empty API_URL from connect-src', () => {
    process.env.API_URL = '';

    expect(getContentSecurityPolicy()).toContain("connect-src 'self' https:;");
  });

  test('appends ALLOWED_FRAME_URLS to frame-ancestors', () => {
    process.env.ALLOWED_FRAME_URLS = 'https://umami.is';

    expect(getContentSecurityPolicy()).toContain("frame-ancestors 'self' https://umami.is;");
  });

  test('keeps frame-ancestors to self when ALLOWED_FRAME_URLS is missing', () => {
    expect(getContentSecurityPolicy()).toContain("frame-ancestors 'self';");
  });

  test('includes every expected directive and ends with a semicolon', () => {
    const policy = getContentSecurityPolicy();

    expect(policy).toContain("default-src 'self'");
    expect(policy).toContain("img-src 'self' https: data: blob:");
    expect(policy).toContain("script-src 'self' 'unsafe-eval' 'unsafe-inline'");
    expect(policy).toContain("style-src 'self' 'unsafe-inline'");
    expect(policy).toContain("connect-src 'self' https:");
    expect(policy).toContain("frame-src 'self' http: https:");
    expect(policy).toContain("frame-ancestors 'self'");
    expect(policy.endsWith(';')).toBe(true);
  });

  test('re-reads the environment on every call', () => {
    const before = getContentSecurityPolicy();

    process.env.API_URL = 'https://api.example.com';
    process.env.ALLOWED_FRAME_URLS = 'https://umami.is';

    const after = getContentSecurityPolicy();

    expect(before).not.toContain('https://api.example.com');
    expect(before).not.toContain('https://umami.is');
    expect(after).toContain("connect-src 'self' https: https://api.example.com;");
    expect(after).toContain("frame-ancestors 'self' https://umami.is;");
  });
});
