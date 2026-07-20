import { describe, expect, it } from 'vitest'
import { resolveBranchFallback } from '../src/shared/branch'

describe('resolveBranchFallback', () => {
  it('keeps a valid requested branch', () => {
    expect(resolveBranchFallback('feature', ['main', 'feature'], 'main', false)).toEqual({
      branch: 'feature',
      warning: null
    })
  })

  it('falls back when saved branch is deleted', () => {
    const result = resolveBranchFallback('gone', ['main', 'develop'], 'develop', false)
    expect(result.branch).toBe('develop')
    expect(result.warning).toContain('gone')
  })

  it('uses main → master → first for detached HEAD', () => {
    expect(resolveBranchFallback(null, ['develop', 'main'], null, true)).toEqual({
      branch: 'main',
      warning: '当前处于 detached HEAD，已回退到「main」'
    })

    expect(resolveBranchFallback(null, ['develop', 'master'], null, true)).toEqual({
      branch: 'master',
      warning: '当前处于 detached HEAD，已回退到「master」'
    })

    expect(resolveBranchFallback(null, ['develop', 'hotfix'], null, true)).toEqual({
      branch: 'develop',
      warning: '当前处于 detached HEAD，已回退到「develop」'
    })
  })

  it('returns null when there are no local branches', () => {
    expect(resolveBranchFallback('main', [], null, true)).toEqual({
      branch: null,
      warning: '仓库没有可用的本地分支'
    })
  })
})
