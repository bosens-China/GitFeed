import { describe, expect, it } from 'vitest'
import { isNewerVersion, parseLatestRelease } from '../src/main/update'

describe('isNewerVersion', () => {
  it('compares semantic version numbers and accepts a v prefix', () => {
    expect(isNewerVersion('v1.2.0', '1.1.9')).toBe(true)
    expect(isNewerVersion('1.1.9', '1.2.0')).toBe(false)
    expect(isNewerVersion('1.2.0', '1.2.0')).toBe(false)
  })

  it('treats a stable release as newer than the matching prerelease', () => {
    expect(isNewerVersion('1.2.0', '1.2.0-beta.1')).toBe(true)
  })
})

describe('parseLatestRelease', () => {
  it('accepts a GitHub HTTPS release URL', () => {
    expect(
      parseLatestRelease({
        tag_name: 'v1.2.0',
        html_url: 'https://github.com/bosens-China/GitFeed/releases/tag/v1.2.0'
      })
    ).toEqual({
      tag_name: 'v1.2.0',
      html_url: 'https://github.com/bosens-China/GitFeed/releases/tag/v1.2.0'
    })
  })

  it('rejects malformed release data and non-GitHub URLs', () => {
    expect(() => parseLatestRelease({})).toThrow('版本服务未返回发布版本')
    expect(() =>
      parseLatestRelease({ tag_name: 'v1.2.0', html_url: 'https://example.com/release' })
    ).toThrow('发布页地址无效')
  })
})
