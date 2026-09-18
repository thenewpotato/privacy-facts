import test from 'node:test';
import assert from 'node:assert/strict';
import { analysisDimensions, withAnalysisAnalytics } from './analysis-analytics.js';
import { onRequest } from '../functions/privacy-facts/api/analyze.js';

test('retains only normalized public domains, grouping private hosting tenants', () => {
  assert.deepEqual(analysisDimensions({ url: 'https://alice.docs.EXAMPLE.co.uk/private?email=secret#token' }),
    { domain: 'example.co.uk', kind: 'url' });
  assert.deepEqual(analysisDimensions({ url: 'https://alice.github.io/privacy' }),
    { domain: 'github.io', kind: 'url' });
  assert.deepEqual(analysisDimensions({ text: 'private policy', url: 'https://example.com' }),
    { domain: 'pasted_text', kind: 'text' });
  for (const url of ['https://user:secret@example.com', 'http://127.0.0.1', 'http://[::1]',
    'http://localhost', 'https://private.internal', 'ftp://example.com', 'not a url']) {
    assert.equal(analysisDimensions({ url }), null);
  }
  assert.equal(analysisDimensions(null), null);
});

function context(body, options = {}) {
  const events = [];
  return {
    events,
    request: new Request('https://tigrw.com/privacy-facts/api/analyze', {
      method: 'POST', headers: { 'content-type': 'application/json', 'cf-connecting-ip': '192.0.2.1' },
      body: JSON.stringify(body), ...options,
    }),
    env: { ANALYSIS_ANALYTICS: { writeDataPoint: (event) => events.push(event) } },
  };
}

test('records exactly once and leaves request and response intact', async () => {
  const input = { url: 'https://customer.example.com/private?token=secret' };
  const ctx = context(input);
  const response = Response.json({ arbitrary: 'unchanged' });
  const result = await withAnalysisAnalytics(async ({ request }) => {
    assert.deepEqual(await request.json(), input);
    return response;
  })(ctx);
  assert.equal(result, response);
  assert.deepEqual(ctx.events, [{ indexes: ['example.com'], blobs: ['example.com', 'url', 'success'], doubles: [1] }]);
  assert(!JSON.stringify(ctx.events).includes('secret'));
});

test('records returned errors and thrown failures once without error content', async () => {
  const ctx = context({ text: 'sensitive content' });
  await withAnalysisAnalytics(async () => new Response('private error', { status: 400 }))(ctx);
  assert.deepEqual(ctx.events[0].blobs, ['pasted_text', 'text', 'failure']);
  const thrown = context({ text: 'private' });
  await assert.rejects(withAnalysisAnalytics(async () => { throw new Error('private error'); })(thrown));
  assert.equal(thrown.events.length, 1);
  assert.equal(thrown.events[0].blobs[2], 'failure');
});

test('skips invalid submissions, health-style GETs, and oversized bodies', async () => {
  const inputs = [
    context({}, { body: '{' }), context({}),
    context({ text: 'a'.repeat(91 * 1024) }),
    context({ text: 'hello' }, { headers: { 'content-type': 'text/plain' } }),
    context({}, { method: 'GET', body: undefined }),
  ];
  for (const ctx of inputs) {
    let called = 0;
    await withAnalysisAnalytics(async ({ request }) => {
      await request.text(); called++; return new Response();
    })(ctx);
    assert.equal(called, 1);
    assert.deepEqual(ctx.events, []);
  }
});

test('absent or failing analytics never changes application behavior', async () => {
  for (const env of [{}, { ANALYSIS_ANALYTICS: { writeDataPoint() { throw new Error('offline'); } } }]) {
    const ctx = context({ text: 'private' }); ctx.env = env;
    const response = new Response('okay');
    assert.equal(await withAnalysisAnalytics(async () => response)(ctx), response);
  }
});

test('Pages entry point wires optional analytics without changing errors', { timeout: 2000 }, async () => {
  const ctx = context({ url: 'https://alice.example.com/privacy?secret=hidden' });
  const response = await onRequest(ctx);
  assert.equal(response.status, 503); // No key: no external model request.
  assert.deepEqual(ctx.events[0].blobs, ['example.com', 'url', 'failure']);
  const oversized = context({ text: 'a'.repeat(91 * 1024) });
  assert.equal((await onRequest(oversized)).status, 400);
  assert.deepEqual(oversized.events, []);
});
