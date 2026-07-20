import { describe, expect, it } from 'vitest'
import {
  collectAuthors,
  computeStats,
  filterCommitsByAuthors,
  reconcileAuthorsFilter
} from '../src/shared/commit-utils'
import type { CommitItem } from '../src/shared/models'

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

  it('clears author selection when any selected author disappears', () => {
    const result = reconcileAuthorsFilter(
      {
        mode: 'selected',
        authors: [
          { name: 'Ann', email: 'a@x.com' },
          { name: 'Bob', email: 'b@x.com' }
        ]
      },
      [{ name: 'Ann', email: 'a@x.com' }]
    )
    expect(result).toEqual({ mode: 'selected', authors: [] })
  })

  it('keeps all mode unchanged during reconcile', () => {
    expect(reconcileAuthorsFilter({ mode: 'all' }, [{ name: 'Ann', email: 'a@x.com' }])).toEqual({
      mode: 'all'
    })
  })

  it('filters commits by selected authors and empty selection', () => {
    const commits = [
      commit({ hash: '1', authorName: 'Ann', authorEmail: 'a@x.com' }),
      commit({ hash: '2', authorName: 'Bob', authorEmail: 'b@x.com' })
    ]
    expect(filterCommitsByAuthors(commits, { mode: 'all' })).toHaveLength(2)
    expect(
      filterCommitsByAuthors(commits, {
        mode: 'selected',
        authors: [{ name: 'Bob', email: 'b@x.com' }]
      })
    ).toEqual([commits[1]])
    expect(filterCommitsByAuthors(commits, { mode: 'selected', authors: [] })).toEqual([])
  })
})
