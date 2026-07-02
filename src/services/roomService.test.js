import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  getRoomChat,
  getMessageRoomChat,
  getDirectPartnerName,
  createGroupChat,
  addMembersToRoom,
  searchUsers,
  markRoomAsRead,
  getRoomMembers,
  removeMemberFromRoom,
  deleteRoom,
  uploadRoomImage,
} from './roomService'
import { setAccessToken, clearAccessToken } from './authService'
import { makeToken, mockFetch } from '../test/helpers'

const BASE = 'http://api.test'
const TOKEN = makeToken()

beforeEach(() => {
  setAccessToken(TOKEN)
})

afterEach(() => {
  clearAccessToken()
  vi.restoreAllMocks()
})

// Helper: pull (url, opts) of the first fetch call
function firstCall(fetchMock) {
  return fetchMock.mock.calls[0]
}

describe('roomService requests', () => {
  it('getRoomChat GETs /rooms with a bearer token', async () => {
    const fetchMock = mockFetch({ rooms: [] })
    await getRoomChat()
    const [url, opts] = firstCall(fetchMock)
    expect(url).toBe(`${BASE}/rooms`)
    expect(opts.method).toBe('GET')
    expect(opts.headers.Authorization).toBe(`Bearer ${TOKEN}`)
  })

  it('getMessageRoomChat builds the before_id/limit query string', async () => {
    const fetchMock = mockFetch({ messages: [] })
    await getMessageRoomChat(7, { beforeId: 100, limit: 20 })
    const [url] = firstCall(fetchMock)
    expect(url).toBe(`${BASE}/rooms/messages/7?before_id=100&limit=20`)
  })

  it('getMessageRoomChat omits before_id when it is 0', async () => {
    const fetchMock = mockFetch({ messages: [] })
    await getMessageRoomChat(7, { beforeId: 0, limit: 40 })
    const [url] = firstCall(fetchMock)
    expect(url).toBe(`${BASE}/rooms/messages/7?limit=40`)
  })

  it('getDirectPartnerName hits the direct-name endpoint', async () => {
    const fetchMock = mockFetch({})
    await getDirectPartnerName(9)
    expect(firstCall(fetchMock)[0]).toBe(`${BASE}/rooms/direct-name/9`)
  })

  it('createGroupChat POSTs name + member_ids', async () => {
    const fetchMock = mockFetch({})
    await createGroupChat('Team', [1, 2])
    const [url, opts] = firstCall(fetchMock)
    expect(url).toBe(`${BASE}/rooms/group`)
    expect(opts.method).toBe('POST')
    expect(JSON.parse(opts.body)).toEqual({ name: 'Team', member_ids: [1, 2] })
  })

  it('addMembersToRoom POSTs room_id + user_ids', async () => {
    const fetchMock = mockFetch({})
    await addMembersToRoom(3, [4, 5])
    const [, opts] = firstCall(fetchMock)
    expect(JSON.parse(opts.body)).toEqual({ room_id: 3, user_ids: [4, 5] })
  })

  it('searchUsers short-circuits for keywords under 2 chars', async () => {
    const fetchMock = mockFetch({ users: [] })
    const res = await searchUsers('a')
    expect(res).toEqual({ users: [] })
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('searchUsers builds the q/limit query for valid keywords', async () => {
    const fetchMock = mockFetch({ users: [] })
    await searchUsers('bob', 5)
    expect(firstCall(fetchMock)[0]).toBe(`${BASE}/users/search?q=bob&limit=5`)
  })

  it('markRoomAsRead POSTs to /rooms/read/:id', async () => {
    const fetchMock = mockFetch({})
    await markRoomAsRead(12)
    const [url, opts] = firstCall(fetchMock)
    expect(url).toBe(`${BASE}/rooms/read/12`)
    expect(opts.method).toBe('POST')
  })

  it('getRoomMembers GETs /rooms/members/:id', async () => {
    const fetchMock = mockFetch({ members: [] })
    await getRoomMembers(2)
    expect(firstCall(fetchMock)[0]).toBe(`${BASE}/rooms/members/2`)
  })

  it('removeMemberFromRoom DELETEs the member', async () => {
    const fetchMock = mockFetch({})
    await removeMemberFromRoom(2, 8)
    const [url, opts] = firstCall(fetchMock)
    expect(url).toBe(`${BASE}/rooms/2/members/8`)
    expect(opts.method).toBe('DELETE')
  })

  it('deleteRoom DELETEs /rooms/delete/:id', async () => {
    const fetchMock = mockFetch({})
    await deleteRoom(4)
    const [url, opts] = firstCall(fetchMock)
    expect(url).toBe(`${BASE}/rooms/delete/4`)
    expect(opts.method).toBe('DELETE')
  })

  it('uploadRoomImage sends FormData without a JSON Content-Type', async () => {
    const fetchMock = mockFetch({ media_url: '/x.png' })
    await uploadRoomImage(5, new File(['x'], 'x.png', { type: 'image/png' }))
    const [url, opts] = firstCall(fetchMock)
    expect(url).toBe(`${BASE}/rooms/upload-image/5`)
    expect(opts.body).toBeInstanceOf(FormData)
    const keys = Object.keys(opts.headers).map((k) => k.toLowerCase())
    expect(keys).not.toContain('content-type')
  })
})

describe('roomService missing-token guard', () => {
  it('throws when there is no access token', async () => {
    clearAccessToken()
    await expect(getRoomChat()).rejects.toThrow('Missing access token')
  })
})
