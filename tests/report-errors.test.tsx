import { weeklyActivityKey } from '../src/renderer/src/hooks/useWorkbench'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { expect, it, vi } from 'vitest'
import type { RepoQueryResult } from '../src/shared/models'
import { RepositoryQueryErrors } from '../src/renderer/src/features/this-week/RepositoryQueryErrors'

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, options?: { defaultValue?: string }) => options?.defaultValue ?? key
  })
}))
const repo: RepoQueryResult = {
  repoId: 'ok',
  repoName: 'Healthy',
  repoPath: '/ok',
  status: 'available',
  branches: [],
  resolvedBranches: [],
  commits: [],
  stats: { commitCount: 0, additions: 0, deletions: 0, changedFiles: 0 }
}
it('shows per-repository failures even when the aggregate query succeeded', () => {
  const html = renderToStaticMarkup(
    createElement(RepositoryQueryErrors, {
      repos: [
        repo,
        { ...repo, repoId: 'bad', repoName: 'Moved repo', status: 'missing', error: 'Path missing' }
      ]
    })
  )
  expect(html).toContain('不完整')
  expect(html).toContain('Moved repo')
  expect(html).toContain('Path missing')
  expect(html).not.toContain('Healthy')
})
it('does not report healthy or empty repositories as failures', () => {
  expect(
    renderToStaticMarkup(
      createElement(RepositoryQueryErrors, { repos: [repo, { ...repo, status: 'empty' }] })
    )
  ).toBe('')
})

it('keeps per-project and full-report query caches separate', () => {
  const range = { preset: 'thisWeek' as const }
  const all = weeklyActivityKey(range)
  const first = weeklyActivityKey(range, undefined, undefined, 'first')
  const second = weeklyActivityKey(range, undefined, undefined, 'second')
  expect(first).not.toEqual(all)
  expect(first).not.toEqual(second)
})
