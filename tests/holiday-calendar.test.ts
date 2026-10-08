import { expect, it } from 'vitest'
import {
  classifyHolidayDate,
  computeHolidayActivityStats,
  createHolidayCalendar,
  filterRestDayCommits
} from '../src/shared/holiday-calendar'
import type { CommitItem } from '../src/shared/models'
import { buildCommitsWeeklyReportMarkdown } from '../src/shared/markdown'
import bundled2026 from '../src/main/holidays/2026.json'

function commit(date: string, message = 'fix: example'): CommitItem {
  const [year, month, day] = date.split('-').map(Number)
  return {
    hash: date,
    shortHash: date,
    authorName: 'Ann',
    authorEmail: 'ann@example.com',
    authoredAt: new Date(year, month - 1, day, 12).toISOString(),
    message,
    isMerge: false,
    branch: 'main',
    files: []
  }
}

const calendar = createHolidayCalendar([bundled2026])

it('counts active dates once and applies holidays and make-up workdays', () => {
  const commits = [
    commit('2026-10-01'),
    commit('2026-10-01', 'style: second commit'),
    commit('2026-10-08'),
    commit('2026-10-10'),
    commit('2026-10-11')
  ]
  expect(computeHolidayActivityStats(commits, calendar)).toEqual({
    workdayCount: 2,
    restDayCount: 2,
    unknownDayCount: 0
  })
})

it('filters known rest days while retaining make-up workdays and dates with unknown data', () => {
  const commits = [
    commit('2026-10-01'),
    commit('2026-10-08'),
    commit('2026-10-10'),
    commit('2026-10-11'),
    commit('2027-01-01')
  ]
  expect(filterRestDayCommits(commits, calendar).map((item) => item.hash)).toEqual([
    '2026-10-08',
    '2026-10-10',
    '2027-01-01'
  ])
  expect(classifyHolidayDate('2026-10-01', calendar)).toBe('restDay')
  expect(classifyHolidayDate('2026-10-10', calendar)).toBe('workday')
  expect(classifyHolidayDate('2026-10-11', calendar)).toBe('restDay')
  expect(classifyHolidayDate('2027-01-01', calendar)).toBe('unknown')
})

it('does not guess activity on missing years or a December affected by next year', () => {
  expect(
    computeHolidayActivityStats([commit('2026-12-30'), commit('2027-01-01')], calendar)
  ).toEqual({
    workdayCount: 0,
    restDayCount: 0,
    unknownDayCount: 2
  })
})

it('uses the newer year file when it covers a previous December date', () => {
  const updated = createHolidayCalendar([
    {
      year: 2026,
      papers: ['source'],
      days: [{ name: '旧安排', date: '2026-12-31', isOffDay: true }]
    },
    {
      year: 2027,
      papers: ['source'],
      days: [{ name: '新安排', date: '2026-12-31', isOffDay: false }]
    }
  ])
  expect(updated.days.get('2026-12-31')?.name).toBe('新安排')
  expect(computeHolidayActivityStats([commit('2026-12-31')], updated).workdayCount).toBe(1)
})

it('adds date context to Markdown without regrouping commits', () => {
  const markdown = buildCommitsWeeklyReportMarkdown(
    [commit('2026-10-10', 'style: later'), commit('2026-10-01', 'fix: earlier')],
    { holidayCalendar: calendar }
  )
  expect(markdown).toContain('## 2026-10-10 · 国庆节调休上班')
  expect(markdown).toContain('## 2026-10-01 · 国庆节放假')
  expect(markdown).toContain('活跃工作日 1 天，活跃休息日 1 天')
  expect(markdown.indexOf('style: later')).toBeLessThan(markdown.indexOf('fix: earlier'))
})
