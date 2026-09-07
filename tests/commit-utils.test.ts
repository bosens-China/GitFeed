import { describe, expect, it } from 'vitest'
import { collectAuthors, computeStats } from '../src/shared/commit-utils'
import { matchesAnyIdentity, matchesIdentity, type CommitItem } from '../src/shared/models'

function commit(partial: Partial<CommitItem> & Pick<CommitItem, 'hash'>): CommitItem {
  return {
    shortHash: partial.hash.slice(0, 7),
    authorName: 'A',
    authorEmail: 'a@example.com',
    authoredAt: '2026-07-20T00:00:00.000Z',
    message: 'msg',
    isMerge: false,
    branch: 'main',
    files: [],
    ...partial
  }
}

describe('commit-utils', () => {
  it('computes stats with path dedupe and binary skip for line counts', () => {
    const stats = computeStats([
      commit({
        hash: '1',
        files: [
          {
            path: 'a.ts',
            status: 'M',
            additions: 3,
            deletions: 1,
            binary: false
          },
          {
            path: 'bin.png',
            status: 'A',
            additions: null,
            deletions: null,
            binary: true
          }
        ]
      }),
      commit({
        hash: '2',
        files: [
          {
            path: 'a.ts',
            status: 'M',
            additions: 2,
            deletions: 0,
            binary: false
          }
        ]
      })
    ])

    expect(stats).toEqual({
      commitCount: 2,
      activeRepoCount: 0,
      activeDayCount: 1,
      additions: 5,
      deletions: 1,
      changedFiles: 2
    })
  })

  it('counts a rename as one changed file path', () => {
    const stats = computeStats([
      commit({
        hash: '1',
        files: [
          {
            path: 'new.ts',
            previousPath: 'old.ts',
            status: 'R',
            additions: 1,
            deletions: 1,
            binary: false
          }
        ]
      })
    ])
    expect(stats.changedFiles).toBe(1)
    expect(stats.additions).toBe(1)
    expect(stats.deletions).toBe(1)
  })

  it('counts identical paths separately across repositories and days in local time', () => {
    const file = { path: 'README.md', status: 'M', additions: 2, deletions: 1, binary: false }
    const firstDay = new Date(2026, 8, 1, 0, 1).toISOString()
    const nextDay = new Date(2026, 8, 2, 0, 1).toISOString()
    expect(
      computeStats([
        commit({ hash: '1', repoId: 'a', authoredAt: firstDay, files: [file] }),
        commit({ hash: '2', repoId: 'a', authoredAt: firstDay, files: [file] }),
        commit({ hash: '1', repoId: 'b', authoredAt: nextDay, files: [file] })
      ])
    ).toEqual({
      commitCount: 3,
      activeRepoCount: 2,
      activeDayCount: 2,
      additions: 6,
      deletions: 3,
      changedFiles: 2
    })
  })

  it('returns zero statistics for an empty selection', () => {
    expect(computeStats([])).toEqual({
      commitCount: 0,
      activeRepoCount: 0,
      activeDayCount: 0,
      additions: 0,
      deletions: 0,
      changedFiles: 0
    })
  })

  it('collects unique authors sorted by name/email', () => {
    const authors = collectAuthors([
      commit({ hash: '1', authorName: 'Bob', authorEmail: 'b@x.com' }),
      commit({ hash: '2', authorName: 'Ann', authorEmail: 'a@x.com' }),
      commit({ hash: '3', authorName: 'Ann', authorEmail: 'a@x.com' })
    ])
    expect(authors).toEqual([
      { name: 'Ann', email: 'a@x.com' },
      { name: 'Bob', email: 'b@x.com' }
    ])
  })

  it('matches identity with case-insensitive email', () => {
    expect(
      matchesIdentity(
        { name: 'Yang Liu', email: 'YangBoses@gmail.com' },
        { name: 'yliu', email: 'yangboses@gmail.com' }
      )
    ).toBe(true)

    expect(
      matchesAnyIdentity({ name: 'Yang Liu', email: 'other@gmail.com' }, [
        { name: 'yliu', email: 'yangboses@gmail.com' }
      ])
    ).toBe(false)

    expect(matchesAnyIdentity({ name: 'Someone', email: 'someone@x.com' }, [])).toBe(true)
  })
})
