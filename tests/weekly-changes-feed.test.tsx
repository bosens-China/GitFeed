import { createElement, type ReactNode } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { expect, it, vi } from 'vitest'
import type { CommitItem } from '../src/shared/models'
import { WeeklyChangesFeed } from '../src/renderer/src/features/weekly-report/WeeklyChangesFeed'
import { createHolidayCalendar } from '../src/shared/holiday-calendar'
import bundled2026 from '../src/main/holidays/2026.json'

vi.mock('antd', () => ({
  Card: ({ children }: { children: ReactNode }) => createElement('div', null, children),
  Tag: ({ children }: { children: ReactNode }) => createElement('span', null, children),
  Empty: () => null
}))
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }))
vi.mock('../src/renderer/src/features/commits/CommitRow', () => ({
  CommitRow: ({ commit, showRepo }: { commit: CommitItem; showRepo?: boolean }) =>
    createElement('span', { 'data-repo': showRepo ? commit.repoName : '' }, commit.message)
}))
vi.mock('../src/renderer/src/features/commits/CommitDetailsModal', () => ({
  CommitDetailsModal: () => null
}))

it('shows all repositories in author-time order within a day', () => {
  const commit = (message: string, authoredAt: string, repoName: string): CommitItem => ({
    hash: message,
    shortHash: message,
    authorName: 'Ann',
    authorEmail: 'ann@example.com',
    authoredAt,
    message,
    isMerge: false,
    branch: 'main',
    repoId: repoName,
    repoName,
    files: []
  })
  const html = renderToStaticMarkup(
    createElement(WeeklyChangesFeed, {
      commits: [
        commit('A morning', '2026-07-20T01:00:00Z', 'A'),
        commit('B noon', '2026-07-20T04:00:00Z', 'B'),
        commit('A evening', '2026-07-20T10:00:00Z', 'A')
      ],
      holidayCalendar: createHolidayCalendar([])
    })
  )

  expect(html.indexOf('A evening')).toBeLessThan(html.indexOf('B noon'))
  expect(html.indexOf('B noon')).toBeLessThan(html.indexOf('A morning'))
  expect(html).toContain('data-repo="B"')
})

it('shows a holiday badge beside the timeline date', () => {
  const html = renderToStaticMarkup(
    createElement(WeeklyChangesFeed, {
      commits: [
        {
          hash: 'a',
          shortHash: 'a',
          authorName: 'Ann',
          authorEmail: 'ann@example.com',
          authoredAt: new Date(2026, 9, 1, 12).toISOString(),
          message: 'fix: holiday work',
          isMerge: false,
          branch: 'main',
          repoId: 'repo',
          repoName: 'Repo',
          files: []
        }
      ],
      holidayCalendar: createHolidayCalendar([bundled2026])
    })
  )

  expect(html).toContain('国庆节')
  expect(html).toContain('holidays.offDay')
  expect(html).toContain('fix: holiday work')
})
