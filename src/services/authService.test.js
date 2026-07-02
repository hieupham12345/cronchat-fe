import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  setAccessToken,
  getAccessToken,
  clearAccessToken,
  isTokenValid,
  login,
  refreshAccessToken,
  logout,
} from './authService'
import { makeToken, mockFetch } from '../test/helpers'

beforeEach(() => {
  // Default stub so the token auto-refresh scheduler never hits the network,
  // and silence its expected error logging. Individual tests override fetch.
  mockFetch({})
  vi.spyOn(console, 'error').mockImplementation(() => {})
})

afterEach(() => {
  clearAccessToken()
  vi.restoreAllMocks()
})

describe('access token store', () => {
  it('sets and gets the in-memory token', () => {
    setAccessToken(makeToken())
    expect(getAccessToken()).toBeTruthy()
  })

  it('clears the token', () => {
    setAccessToken(makeToken())
    clearAccessToken()
    expect(getAccessToken()).toBeNull()
  })
})

describe('isTokenValid', () => {
  it('is false when no token', () => {
    clearAccessToken()
    expect(isTokenValid()).toBe(false)
  })

  it('is true for a non-expired token', () => {
    setAccessToken(makeToken(3600))
    expect(isTokenValid()).toBe(true)
  })

  it('is false for an expired token', () => {
    setAccessToken(makeToken(-10))
    expect(isTokenValid()).toBe(false)
  })
})

describe('login', () => {
  it('POSTs credentials and stores the returned token', async () => {
    const token = makeToken()
    const fetchMock = mockFetch({ accessToken: token })
    const data = await login('alice', 'pw')

    const [url, opts] = fetchMock.mock.calls[0]
    expect(url).toBe('http://api.test/login')
    expect(opts.method).toBe('POST')
    expect(opts.credentials).toBe('include')
    expect(JSON.parse(opts.body)).toEqual({ username: 'alice', password: 'pw' })
    expect(data.accessToken).toBe(token)
    expect(getAccessToken()).toBe(token)
  })
})

describe('refreshAccessToken', () => {
  it('stores and returns the new token', async () => {
    const token = makeToken()
    mockFetch({ accessToken: token })
    const result = await refreshAccessToken()
    expect(result).toBe(token)
    expect(getAccessToken()).toBe(token)
  })

  it('throws when no token is returned', async () => {
    mockFetch({})
    await expect(refreshAccessToken()).rejects.toThrow('No access token')
  })
})

describe('logout', () => {
  it('clears the token and calls /logout', async () => {
    setAccessToken(makeToken())
    const fetchMock = mockFetch({})
    await logout()
    expect(getAccessToken()).toBeNull()
    expect(fetchMock.mock.calls[0][0]).toBe('http://api.test/logout')
  })
})
