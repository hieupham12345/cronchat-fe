import { vi } from 'vitest'

// Build a syntactically valid JWT with the given expiry (seconds from now).
export function makeToken(expSecondsFromNow = 3600) {
  const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }))
  const payload = btoa(
    JSON.stringify({ exp: Math.floor(Date.now() / 1000) + expSecondsFromNow })
  )
  return `${header}.${payload}.sig`
}

// Install a mocked global fetch that resolves to the given JSON payload.
// Returns the mock so tests can assert on call args.
export function mockFetch(data = {}, { ok = true, status = 200 } = {}) {
  const fn = vi.fn().mockResolvedValue({
    ok,
    status,
    json: async () => data,
  })
  globalThis.fetch = fn
  return fn
}
