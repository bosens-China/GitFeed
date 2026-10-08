import { createElement, type ReactNode } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { beforeEach, expect, it, vi } from 'vitest'
import { buildCommitsWeeklyReportMarkdown, commitPreviewLink } from '../src/shared/markdown'
import type { CommitItem } from '../src/shared/models'
import { MarkdownReportPreview } from '../src/renderer/src/features/this-week/MarkdownReportPreview'

const { select, clicks, timestamps } = vi.hoisted(() => ({
  select: vi.fn(),
  clicks: [] as Array<() => void>,
  timestamps: [] as string[]
}))
// 只替换状态落点和 UI 外壳，运行真实 Markdown 解析及按钮回调。
vi.mock('react', async (importOriginal) => ({
  ...(await importOriginal<typeof import('react')>()),
  useState: () => [null, select]
}))
vi.mock('antd', () => ({
  Button: ({ children, onClick }: { children: ReactNode; onClick: () => void }) => {
    clicks.push(onClick)
    return createElement('button', null, children)
  },
  Empty: () => null,
  Tooltip: ({ children }: { children: ReactNode }) => children
}))
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }))
vi.mock('../src/renderer/src/components/CursorTooltip', () => ({
  CursorTooltip: ({ children, title }: { children: ReactNode; title: string }) => {
    timestamps.push(title)
    return children
  }
}))
vi.mock('../src/renderer/src/features/commits/CommitDetailsModal', () => ({
  CommitDetailsModal: () => null
}))
const commit: CommitItem = {
  hash: 'abcdef1234567890123456789012345678901234',
  shortHash: 'abcdef1',
  repoId: '/repo A/#%)(中文',
  repoName: 'A',
  branch: 'main',
  authorName: 'Ann',
  authorEmail: 'ann@example.com',
  authoredAt: '2026-09-01T00:00:00Z',
  message: 'feat: shared',
  isMerge: false,
  files: []
}
beforeEach(() => {
  select.mockClear()
  clicks.length = 0
  timestamps.length = 0
})
it('opens the exact repository and full hash even when all visible short hashes collide', () => {
  const commits = [
    commit,
    { ...commit, repoId: '/repo B', repoName: 'B', authoredAt: '2026-09-02T00:00:00Z' },
    {
      ...commit,
      hash: 'abcdef1aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
      message: 'fix: another commit',
      authoredAt: '2026-09-03T00:00:00Z'
    }
  ]
  const markdown = buildCommitsWeeklyReportMarkdown(commits, {
    showRepo: true,
    linkCommits: true
  })
  renderToStaticMarkup(createElement(MarkdownReportPreview, { markdown, commits }))
  expect(clicks).toHaveLength(3)
  // 跨工程也保持时间倒序，短 hash 相同仍定位到各自完整提交。
  clicks.forEach((click) => click())
  expect(select.mock.calls.map(([value]) => value)).toEqual([commits[2], commits[1], commits[0]])
  expect(timestamps.map((value) => value.slice(0, 10))).toEqual([
    '2026-09-03',
    '2026-09-02',
    '2026-09-01'
  ])
  const copied = buildCommitsWeeklyReportMarkdown(commits, { showRepo: true })
  expect(copied).not.toContain('#commit/')
  expect(copied).toContain('(`abcdef1`)')
})
it('does not infer commit links from hash-looking message text', () => {
  const markdown = `- misleading (\`abcdef1\`)\n\n- real ([\`abcdef1\`](<${commitPreviewLink(commit)}>))`
  renderToStaticMarkup(createElement(MarkdownReportPreview, { markdown, commits: [commit] }))
  expect(clicks).toHaveLength(1)
  clicks[0]()
  expect(select).toHaveBeenCalledWith(commit)
})
