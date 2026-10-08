import { describe, expect, it } from 'vitest'
import { buildCommitsWeeklyReportMarkdown } from '../src/shared/markdown'
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
  it('keeps commits in time order across types and repositories', () => {
    const md = buildCommitsWeeklyReportMarkdown(
      [
        commit({
          hash: '111111111111',
          message: 'fix: morning',
          authoredAt: '2026-07-20T01:00:00Z',
          repoName: 'A'
        }),
        commit({
          hash: '222222222222',
          message: 'style: noon',
          authoredAt: '2026-07-20T04:00:00Z',
          repoName: 'B'
        }),
        commit({
          hash: '333333333333',
          message: 'fix: evening',
          authoredAt: '2026-07-20T10:00:00Z',
          repoName: 'A'
        }),
        commit({
          hash: '444444444444',
          message: 'feat: yesterday',
          authoredAt: '2026-07-19T10:00:00Z',
          repoName: 'B'
        })
      ],
      { title: '项目周报', timeRangeLabel: '2026/08/31 ~ 2026/09/06', showRepo: true }
    )

    expect(md).toContain('# 项目周报')
    expect(md).toContain('> 周期：2026/08/31 ~ 2026/09/06')
    expect(md).toContain('## 2026-07-20')
    expect(md.indexOf('## 2026-07-20')).toBeLessThan(md.indexOf('## 2026-07-19'))
    expect(md.indexOf('fix: evening')).toBeLessThan(md.indexOf('style: noon'))
    expect(md.indexOf('style: noon')).toBeLessThan(md.indexOf('fix: morning'))
    expect(md).not.toContain('### 缺陷修复')
  })

  it('counts identical file paths in different repositories independently', () => {
    const md = buildCommitsWeeklyReportMarkdown([
      commit({ hash: '111111111111', message: 'feat: repo one', repoId: 'r1' }),
      commit({ hash: '222222222222', message: 'fix: repo two', repoId: 'r2' })
    ])

    expect(md).toContain('2 个文件')
  })

  it('preserves multiline commit details without changing report structure', () => {
    const md = buildCommitsWeeklyReportMarkdown(
      [
        commit({
          hash: '333333333333',
          message: 'feat: add [report]\n\n## important detail\n~~~\nsecond line with *markup*',
          repoId: 'r3',
          repoName: 'repo *three*'
        })
      ],
      { showRepo: true }
    )

    expect(md).toContain('**repo \\*three\\***')
    expect(md).toContain('feat: add \\[report\\] (`3333333`)')
    expect(md).toContain('  ## important detail')
    expect(md).toContain('  ~~~~text')
    expect(md).toContain('  ~~~\n')
    expect(md).toContain('second line with *markup*')
    expect(md).not.toContain('\n## important detail')
  })

  it('keeps same-name repositories as separate commit references', () => {
    const md = buildCommitsWeeklyReportMarkdown(
      [
        commit({ hash: '444444444444', message: 'feat: one', repoId: 'r4', repoName: 'same' }),
        commit({ hash: '555555555555', message: 'fix: two', repoId: 'r5', repoName: 'same' })
      ],
      { showRepo: true }
    )

    expect(md.match(/\*\*same\*\*/g)).toHaveLength(2)
    expect(md).toContain('`4444444`')
    expect(md).toContain('`5555555`')
  })
})
