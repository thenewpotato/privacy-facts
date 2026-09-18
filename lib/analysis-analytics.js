import { parse } from 'tldts';

async function readDimensions(request) {
  const reader = request.clone().body?.getReader();
  if (!reader) return null;
  const decoder = new TextDecoder();
  let bytes = 0, text = '';
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      bytes += value.byteLength;
      if (bytes > 90 * 1024) {
        // A tee cancellation waits for the other branch; never await it here.
        void reader.cancel().catch(() => {});
        return null;
      }
      text += decoder.decode(value, { stream: true });
    }
    return analysisDimensions(JSON.parse(text + decoder.decode()));
  } finally { reader.releaseLock(); }
}

// Deliberately discard subdomains, paths, queries, credentials, and content.
export function analysisDimensions(input) {
  if (typeof input?.text === 'string' && input.text.trim()) {
    return { domain: 'pasted_text', kind: 'text' };
  }
  if (typeof input?.url !== 'string' || input.url.length >= 2048) return null;
  try {
    const url = new URL(input.url);
    if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) return null;
    const result = parse(url.hostname, { allowPrivateDomains: true });
    // Private suffix tenants can identify individuals: group them by the host platform.
    const domain = result.isPrivate ? result.publicSuffix : result.isIcann ? result.domain : null;
    if (!domain || result.isIp) return null;
    return { domain, kind: 'url' };
  } catch { return null; }
}

export function withAnalysisAnalytics(handler) {
  return async (context) => {
    const { request, env } = context;
    let dimensions = null;
    if (env.ANALYSIS_ANALYTICS && request.method === 'POST'
      && request.headers.get('content-type')?.toLowerCase().startsWith('application/json')) {
      try {
        dimensions = await readDimensions(request);
      } catch { /* Malformed and oversized submissions are not analytics events. */ }
    }
    const record = (outcome) => {
      if (!dimensions) return;
      try {
        env.ANALYSIS_ANALYTICS.writeDataPoint({
          // One sampling group per domain; never index by visitor identity.
          indexes: [dimensions.domain.slice(0, 96)],
          blobs: [dimensions.domain, dimensions.kind, outcome],
          doubles: [1],
        });
      } catch { /* Analytics must never break an analysis or expose input in logs. */ }
    };
    try {
      const response = await handler(context);
      record(response.ok ? 'success' : 'failure');
      return response;
    } catch (error) {
      record('failure');
      throw error;
    }
  };
}
