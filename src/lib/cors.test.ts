import { afterEach, describe, expect, test } from 'vitest';
import { corsPreflight, getApiCorsHeaders, withCorsHeaders } from './cors';

const ORIGINAL_CORS_MAX_AGE = process.env.CORS_MAX_AGE;

afterEach(() => {
  if (ORIGINAL_CORS_MAX_AGE === undefined) {
    delete process.env.CORS_MAX_AGE;
  } else {
    process.env.CORS_MAX_AGE = ORIGINAL_CORS_MAX_AGE;
  }
});

describe('getApiCorsHeaders', () => {
  test('defaults Access-Control-Max-Age to 86400 when CORS_MAX_AGE is unset', () => {
    delete process.env.CORS_MAX_AGE;

    expect(getApiCorsHeaders()['Access-Control-Max-Age']).toBe('86400');
  });

  test('resolves CORS_MAX_AGE per call instead of freezing it at import time', () => {
    process.env.CORS_MAX_AGE = '3600';
    expect(getApiCorsHeaders()['Access-Control-Max-Age']).toBe('3600');

    process.env.CORS_MAX_AGE = '7200';
    expect(getApiCorsHeaders()['Access-Control-Max-Age']).toBe('7200');
  });

  test('keeps explicit headers able to override Access-Control-Max-Age', () => {
    process.env.CORS_MAX_AGE = '3600';

    expect(getApiCorsHeaders({ 'Access-Control-Max-Age': '60' })['Access-Control-Max-Age']).toBe(
      '60',
    );
  });
});

describe('withCorsHeaders', () => {
  test('applies the current CORS_MAX_AGE to the response', () => {
    process.env.CORS_MAX_AGE = '1234';

    const response = withCorsHeaders(new Response('ok'));

    expect(response.headers.get('Access-Control-Max-Age')).toBe('1234');
  });
});

describe('corsPreflight', () => {
  test('applies the current CORS_MAX_AGE to the preflight response', () => {
    process.env.CORS_MAX_AGE = '5678';

    const response = corsPreflight();

    expect(response.status).toBe(204);
    expect(response.headers.get('Access-Control-Max-Age')).toBe('5678');
  });
});
