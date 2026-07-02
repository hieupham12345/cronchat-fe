import { describe, it, expect, vi, afterEach } from 'vitest'
import { apiFetch } from './apiClient'
import { mockFetch } from '../test/helpers'

const BASE = 'http://api.test'

afterEach(() => {
  vi.restoreAllMocks()
})

describe('apiFetch', () => {
  it('prefixes the path with VITE_API_BASE_URL', async () => {
    const fetchMock = mockFetch({ ok: true })
    await apiFetch('/rooms')
    expect(fetchMock).toHaveBeenCalledWith(`${BASE}/rooms`, expect.any(Object))
  })

  it('defaults Content-Type to application/json for non-FormData bodies', async () => {
    const fetchMock = mockFetch({})
    await apiFetch('/x', { method: 'POST', body: JSON.stringify({ a: 1 }) })
    const [, opts] = fetchMock.mock.calls[0]
    expect(opts.headers['Content-Type']).toBe('application/json')
  })

  it('does NOT set Content-Type when body is FormData', async () => {
    const fetchMock = mockFetch({})
    const fd = new FormData()
    fd.append('file', new Blob(['x']))
    await apiFetch('/upload', { method: 'POST', body: fd })
    const [, opts] = fetchMock.mock.calls[0]
    const keys = Object.keys(opts.headers).map((k) => k.toLowerCase())
    expect(keys).not.toContain('content-type')
  })

  it('respects a caller-supplied Content-Type', async () => {
    const fetchMock = mockFetch({})
    await apiFetch('/x', {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' },
      body: 'hi',
    })
    const [, opts] = fetchMock.mock.calls[0]
    expect(opts.headers['Content-Type']).toBe('text/plain')
  })

  it('returns parsed JSON on success', async () => {
    mockFetch({ hello: 'world' })
    await expect(apiFetch('/x')).resolves.toEqual({ hello: 'world' })
  })

  it('throws with the server error message on !ok', async () => {
    mockFetch({ error: 'boom' }, { ok: false, status: 400 })
    await expect(apiFetch('/x')).rejects.toThrow('boom')
  })

  it('throws a status fallback message when body has no error field', async () => {
    mockFetch(null, { ok: false, status: 503 })
    await expect(apiFetch('/x')).rejects.toThrow('Request failed: 503')
  })
})
