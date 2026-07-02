import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  getListUser,
  getDirectChat,
  uploadAvatar,
  getUserInfo,
  updateUserInfo,
  updatePassword,
} from './userService'
import { setAccessToken, clearAccessToken } from './authService'
import { makeToken, mockFetch } from '../test/helpers'

const BASE = 'http://api.test'
const TOKEN = makeToken()

beforeEach(() => setAccessToken(TOKEN))
afterEach(() => {
  clearAccessToken()
  vi.restoreAllMocks()
})

describe('userService', () => {
  it('getListUser GETs the listing endpoint', async () => {
    const fetchMock = mockFetch([])
    await getListUser()
    const [url, opts] = fetchMock.mock.calls[0]
    expect(url).toBe(`${BASE}/get-all-user-listing`)
    expect(opts.headers.Authorization).toBe(`Bearer ${TOKEN}`)
  })

  it('getDirectChat GETs the direct room for a user', async () => {
    const fetchMock = mockFetch({})
    await getDirectChat(11)
    expect(fetchMock.mock.calls[0][0]).toBe(`${BASE}/rooms/direct/11`)
  })

  it('uploadAvatar POSTs FormData with no JSON Content-Type', async () => {
    const fetchMock = mockFetch({ avatar_url: '/a.png' })
    await uploadAvatar(new File(['x'], 'a.png', { type: 'image/png' }))
    const [url, opts] = fetchMock.mock.calls[0]
    expect(url).toBe(`${BASE}/users/avatar`)
    expect(opts.body).toBeInstanceOf(FormData)
    const keys = Object.keys(opts.headers).map((k) => k.toLowerCase())
    expect(keys).not.toContain('content-type')
  })

  it('uploadAvatar throws when no file is given', async () => {
    await expect(uploadAvatar(null)).rejects.toThrow('Missing file')
  })

  it('getUserInfo GETs /me', async () => {
    const fetchMock = mockFetch({})
    await getUserInfo()
    expect(fetchMock.mock.calls[0][0]).toBe(`${BASE}/me`)
  })

  it('updateUserInfo PUTs the payload', async () => {
    const fetchMock = mockFetch({})
    await updateUserInfo({ full_name: 'Bob' })
    const [url, opts] = fetchMock.mock.calls[0]
    expect(url).toBe(`${BASE}/update-user`)
    expect(opts.method).toBe('PUT')
    expect(JSON.parse(opts.body)).toEqual({ full_name: 'Bob' })
  })

  it('updatePassword PUTs to /update-password', async () => {
    const fetchMock = mockFetch({})
    await updatePassword({ current_password: 'a', new_password: 'b' })
    const [url, opts] = fetchMock.mock.calls[0]
    expect(url).toBe(`${BASE}/update-password`)
    expect(opts.method).toBe('PUT')
  })
})
