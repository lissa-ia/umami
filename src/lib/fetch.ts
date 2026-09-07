import { buildPath } from '@/lib/url';

export interface ErrorResponse {
  error: {
    status: number;
    message: string;
    code?: string;
  };
}

export interface FetchResponse {
  ok: boolean;
  status: number;
  data?: any;
  error?: ErrorResponse;
}

async function parseBody(res: Response) {
  try {
    return await res.json();
  } catch {
    return undefined;
  }
}

function toErrorResponse(res: Response, data: any): ErrorResponse {
  const body = (data && typeof data.error === 'object' && data.error) || {};
  const message =
    typeof body.message === 'string' && body.message.length > 0
      ? body.message
      : res.statusText || 'Request failed';

  return {
    error: {
      status: res.status,
      message,
      ...(typeof body.code === 'string' && body.code.length > 0 && { code: body.code }),
    },
  };
}

export async function request(
  method: string,
  url: string,
  body?: string,
  headers: object = {},
): Promise<FetchResponse> {
  return fetch(url, {
    method,
    cache: 'no-cache',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      ...headers,
    },
    body,
  }).then(async res => {
    const data = await parseBody(res);

    return {
      ok: res.ok,
      status: res.status,
      data,
      ...(!res.ok && { error: toErrorResponse(res, data) }),
    };
  });
}

export async function httpGet(path: string, params: object = {}, headers: object = {}) {
  return request('GET', buildPath(path, params), undefined, headers);
}

export async function httpDelete(path: string, params: object = {}, headers: object = {}) {
  return request('DELETE', buildPath(path, params), undefined, headers);
}

export async function httpPost(path: string, params: object = {}, headers: object = {}) {
  return request('POST', path, JSON.stringify(params), headers);
}

export async function httpPut(path: string, params: object = {}, headers: object = {}) {
  return request('PUT', path, JSON.stringify(params), headers);
}
