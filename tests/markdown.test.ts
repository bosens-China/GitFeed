import { describe, expect, it } from 'vitest'
import { buildCommitsMarkdown, buildCommitsWeeklyReportMarkdown } from '../src/shared/markdown'
import { parseCommitCategory } from '../src/shared/commit-category'
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

describe('buildCommitsWeeklyReportMarkdown', () => {
  it('generates categorized commits weekly report markdown', () => {
    expect(parseCommitCategory('feat(ui): add search bar').key).toBe('feat')
    expect(parseCommitCategory('fix: memory leak in chart').key).toBe('fix')
    expect(parseCommitCategory('style: clean up padding').key).toBe('style')
    expect(parseCommitCategory('random commit without prefix').key).toBe('other')

    const md = buildCommitsWeeklyReportMarkdown(
      [
        commit({ hash: '111111111111', message: 'feat: add dashboard' }),
        commit({ hash: '222222222222', message: 'fix: resolve crash on null' })
      ],
      { title: '项目周报', timeRangeLabel: '2026/08/31 ~ 2026/09/06' }
    )

    expect(md).toContain('# 项目周报')
    expect(md).toContain('> 周期：2026/08/31 ~ 2026/09/06')
    expect(md).toContain('新功能')
    expect(md).toContain('缺陷修复')
    expect(md).toContain('feat: add dashboard (`1111111`)')
    expect(md).toContain('fix: resolve crash on null (`2222222`)')
  })

  it('counts identical file paths in different repositories independently', () => {
    const md = buildCommitsWeeklyReportMarkdown([
      commit({ hash: '111111111111', message: 'feat: repo one', repoId: 'r1' }),
      commit({ hash: '222222222222', message: 'fix: repo two', repoId: 'r2' })
    ])

    expect(md).toContain('2 个文件')
  })

  it('keeps multiline and markdown-like commit data from changing report structure', () => {
    const md = buildCommitsWeeklyReportMarkdown(
      [
        commit({
          hash: '333333333333',
          message: 'feat: add [report]\n## injected heading',
          repoId: 'r3',
          repoName: 'repo *three*'
        })
      ],
      { groupMode: 'byRepo' }
    )

    expect(md).toContain('## repo \\*three\\*')
    expect(md).toContain('- feat: add \\[report\\] (`3333333`)')
    expect(md).not.toContain('injected heading')
  })

  it('keeps same-name repositories as separate report groups', () => {
    const md = buildCommitsWeeklyReportMarkdown(
      [
        commit({ hash: '444444444444', message: 'feat: one', repoId: 'r4', repoName: 'same' }),
        commit({ hash: '555555555555', message: 'fix: two', repoId: 'r5', repoName: 'same' })
      ],
      { groupMode: 'byRepo' }
    )

    expect(md.match(/^## same$/gm)).toHaveLength(2)
  })
})
