import assert from 'node:assert/strict';
import { test } from 'node:test';
import { requestIdMiddleware } from './request-id.middleware';

type FakeReq = {
  headers: Record<string, string>;
  header(name: string): string | undefined;
  requestId?: string;
};

function makeReq(headers: Record<string, string> = {}): FakeReq {
  return {
    headers,
    header(name: string) {
      return headers[name.toLowerCase()];
    },
  };
}

function makeRes() {
  const set: Record<string, string> = {};
  return {
    setHeader(k: string, v: string) {
      set[k] = v;
    },
    get headers() {
      return set;
    },
  };
}

test('gelen x-request-id korunur', () => {
  const req = makeReq({ 'x-request-id': 'req_abc' });
  const res = makeRes();
  let nexted = false;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  requestIdMiddleware(req as any, res as any, () => (nexted = true));
  assert.equal(req.requestId, 'req_abc');
  assert.equal(res.headers['x-request-id'], 'req_abc');
  assert.equal(nexted, true);
});

test('header yoksa req_ önekli id üretilir', () => {
  const req = makeReq();
  const res = makeRes();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  requestIdMiddleware(req as any, res as any, () => undefined);
  assert.match(req.requestId ?? '', /^req_/);
});
