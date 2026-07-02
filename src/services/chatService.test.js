import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  sendMessage,
  toggleReaction,
  removeReaction,
  removeAllMyReactions,
  getReactionSummary,
  markRoomSeenUpTo,
  getRoomLastSeen,
  listMessageSeenUsers,
  getUnreadCountsByRooms,
} from './chatService'
import { setAccessToken, clearAccessToken } from './authService'
import { makeToken, mockFetch } from '../test/helpers'

const BASE = 'http://api.test'
const TOKEN = makeToken()

beforeEach(() => setAccessToken(TOKEN))
afterEach(() => {
  clearAccessToken()
  vi.restoreAllMocks()
})

describe('sendMessage', () => {
  it('POSTs content, message_type and reply id', async () => {
    const fetchMock = mockFetch({})
    await sendMessage(3, 'hi', 'text', 99)
    const [url, opts] = fetchMock.mock.calls[0]
    expect(url).toBe(`${BASE}/rooms/send-messages/3`)
    expect(opts.headers.Authorization).toBe(`Bearer ${TOKEN}`)
    expect(JSON.parse(opts.body)).toEqual({
      content: 'hi',
      message_type: 'text',
      reply_to_message_id: 99,
    })
  })
})

describe('reactions', () => {
  it('toggleReaction POSTs message_id + reaction', async () => {
    const fetchMock = mockFetch({})
    await toggleReaction(5, '👍')
    const [url, opts] = fetchMock.mock.calls[0]
    expect(url).toBe(`${BASE}/messages/react/add`)
    expect(JSON.parse(opts.body)).toEqual({ message_id: 5, reaction: '👍' })
  })

  it('toggleReaction rejects an invalid messageId', async () => {
    await expect(toggleReaction(0, '👍')).rejects.toThrow('Invalid messageId')
  })

  it('toggleReaction rejects an empty reaction', async () => {
    await expect(toggleReaction(5, '  ')).rejects.toThrow('Reaction is required')
  })

  it('removeReaction POSTs to the remove endpoint', async () => {
    const fetchMock = mockFetch({})
    await removeReaction(5, '👍')
    expect(fetchMock.mock.calls[0][0]).toBe(`${BASE}/messages/react/remove`)
  })

  it('removeAllMyReactions sends an empty reaction', async () => {
    const fetchMock = mockFetch({})
    await removeAllMyReactions(5)
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({
      message_id: 5,
      reaction: '',
    })
  })

  it('getReactionSummary GETs the summary for a message', async () => {
    const fetchMock = mockFetch({})
    await getReactionSummary(5)
    expect(fetchMock.mock.calls[0][0]).toBe(`${BASE}/messages/reactions/5`)
  })
})

describe('seen receipts', () => {
  it('markRoomSeenUpTo POSTs room_id + up_to_message_id', async () => {
    const fetchMock = mockFetch({})
    await markRoomSeenUpTo(3, 42)
    const [url, opts] = fetchMock.mock.calls[0]
    expect(url).toBe(`${BASE}/rooms/seen`)
    expect(JSON.parse(opts.body)).toEqual({ room_id: 3, up_to_message_id: 42 })
  })

  it('getRoomLastSeen GETs last-seen for a room', async () => {
    const fetchMock = mockFetch({})
    await getRoomLastSeen(3)
    expect(fetchMock.mock.calls[0][0]).toBe(`${BASE}/rooms/last-seen/3`)
  })

  it('listMessageSeenUsers clamps the limit to 200', async () => {
    const fetchMock = mockFetch({})
    await listMessageSeenUsers(9, 9999)
    expect(fetchMock.mock.calls[0][0]).toBe(`${BASE}/messages/seen/users/9?limit=200`)
  })

  it('getUnreadCountsByRooms GETs the unread-counts endpoint', async () => {
    const fetchMock = mockFetch({})
    await getUnreadCountsByRooms()
    expect(fetchMock.mock.calls[0][0]).toBe(`${BASE}/rooms/unread-counts`)
  })
})
