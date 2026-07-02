import { describe, it, expect } from 'vitest'
import buildImageUrl from './imageHandle'

const BASE = 'http://api.test'

describe('buildImageUrl', () => {
  it('returns empty string for falsy / blank input', () => {
    expect(buildImageUrl('')).toBe('')
    expect(buildImageUrl(null)).toBe('')
    expect(buildImageUrl('   ')).toBe('')
  })

  it('passes through absolute http(s) urls unchanged', () => {
    expect(buildImageUrl('https://cdn.x/a.png')).toBe('https://cdn.x/a.png')
    expect(buildImageUrl('http://cdn.x/a.png')).toBe('http://cdn.x/a.png')
  })

  it('prefixes a leading-slash path with the API base', () => {
    expect(buildImageUrl('/static/a.png')).toBe(`${BASE}/static/a.png`)
  })

  it('joins a bare relative path with a single slash', () => {
    expect(buildImageUrl('user_avatars/a.png')).toBe(`${BASE}/user_avatars/a.png`)
  })
})
