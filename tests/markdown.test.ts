import { describe, expect, it } from 'vitest'
import { buildCommitsWeeklyReportMarkdown } from '../src/shared/markdown'
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

describe('buildCommitsWeeklyReportMarkdown', () => {
  it('does not generate an empty report', () => {
    expect(buildCommitsWeeklyReportMarkdown([])).toBe('')
  })
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
