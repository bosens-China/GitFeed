import { describe, expect, it } from 'vitest'
import { buildCommitsMarkdown } from '../src/shared/markdown'
import type { CommitItem } from '../src/shared/models'

function commit(partial: Partial<CommitItem> & Pick<CommitItem, 'hash' | 'message'>): CommitItem {
  return {
    shortHash: partial.hash.slice(0, 7),
    authorName: 'Ann',
    authorEmail: 'a@x.com',
    authoredAt: '2026-07-20T07:30:00.000Z',
    isMerge: false,
    branch: 'main',
    files: [
      {
        path: 'src/App.tsx',
        status: 'M',
        additions: 2,
        deletions: 1,
        binary: false
      }
    ],
    ...partial
  }
}

describe('buildCommitsMarkdown', () => {
  it('includes range summary and full multiline message safely', () => {
    const markdown = buildCommitsMarkdown({
      repoName: 'gitfeed',
      repoPath: '/tmp/gitfeed',
      branch: 'main',
      timeRange: {
        start: new Date(2026, 6, 20),
        end: new Date(2026, 6, 20, 18),
        label: '2026-07-20 00:00 ～ 2026-07-20 18:00（Asia/Shanghai）',
        timezone: 'Asia/Shanghai'
      },
      authorsFilter: { mode: 'all' },
      allAuthors: [{ name: 'Ann', email: 'a@x.com' }],
      includeMerge: false,
      stats: { commitCount: 1, additions: 2, deletions: 1, changedFiles: 1 },
      commits: [
        commit({
          hash: 'abcdef123456',
          message: '完成仓库筛选\n\n详情包含 *星号* 与 `代码`\n第二行'
        })
      ]
    })

    expect(markdown).toContain('# Git 提交摘要')
    expect(markdown).toContain('- 仓库：gitfeed')
    expect(markdown).toContain('- 作者：全部')
    expect(markdown).toContain('- 包含 merge：否')
    expect(markdown).toContain('### abcdef1 完成仓库筛选')
    expect(markdown).toContain('详情包含 *星号* 与 `代码`')
    expect(markdown).toContain('- [M] src/App.tsx (+2/-1)')
  })

  it('renders empty selection and empty commit list', () => {
    const markdown = buildCommitsMarkdown({
      repoName: 'gitfeed',
      repoPath: '/tmp/gitfeed',
      branch: 'main',
      timeRange: {
        start: new Date(2026, 6, 20),
        end: new Date(2026, 6, 20, 18),
        label: 'label',
        timezone: 'Asia/Shanghai'
      },
      authorsFilter: { mode: 'selected', authors: [] },
      allAuthors: [],
      includeMerge: true,
      stats: { commitCount: 0, additions: 0, deletions: 0, changedFiles: 0 },
      commits: []
    })

    expect(markdown).toContain('- 作者：无')
    expect(markdown).toContain('- 包含 merge：是')
    expect(markdown).toContain('（当前范围无提交）')
  })

  it('keeps markdown structure valid when commit data contains markdown fences', () => {
    const markdown = buildCommitsMarkdown({
      repoName: 'git|feed',
      repoPath: '/tmp/gitfeed',
      branch: 'main',
      timeRange: {
        start: new Date(2026, 6, 20),
        end: new Date(2026, 6, 20, 18),
        label: 'label',
        timezone: 'Asia/Shanghai'
      },
      authorsFilter: { mode: 'all' },
      allAuthors: [{ name: 'Ann', email: 'a@x.com' }],
      includeMerge: false,
      stats: { commitCount: 1, additions: 1, deletions: 0, changedFiles: 1 },
      commits: [
        commit({
          hash: 'abcdef123456',
          message: 'fix *title*\n\nbody contains ``` fence',
          files: [
            {
              path: 'docs/a[b].md',
              status: 'A',
              additions: 1,
              deletions: 0,
              binary: false
            }
          ]
        })
      ]
    })

    expect(markdown).toContain('- 仓库：git\\|feed')
    expect(markdown).toContain('### abcdef1 fix \\*title\\*')
    expect(markdown).toContain('````\nbody contains ``` fence\n````')
    expect(markdown).toContain('docs/a\\[b\\].md')
  })
})
