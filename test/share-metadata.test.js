import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { load } from 'cheerio';

test('share previews and Apple icons use page-specific lock PNGs', () => {
  const root = new URL('../', import.meta.url);
  const $ = load(readFileSync(new URL('index.html', root), 'utf8'));
  for (const [selector, size] of [
    ['link[rel="icon"][type="image/png"]', 32],
    ['link[rel="apple-touch-icon"]', 180],
    ['meta[property="og:image"]', 512],
    ['meta[name="twitter:image"]', 512],
  ]) {
    const target = $(selector).attr('href') ?? $(selector).attr('content');
    assert.ok(target.endsWith(`/lock-${size}.png`) || target === `%BASE_URL%lock-${size}.png`);
    const png = readFileSync(new URL(`public/lock-${size}.png`, root));
    assert.equal(png.subarray(1, 4).toString(), 'PNG');
    assert.equal(png.readUInt32BE(16), size);
    assert.equal(png.readUInt32BE(20), size);
  }
  assert.match($('meta[property="og:image"]').attr('content'), /^https:\/\//);
  assert.equal($('meta[name="twitter:card"]').attr('content'), 'summary');
});
