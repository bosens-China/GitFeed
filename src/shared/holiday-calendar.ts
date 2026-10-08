import type { HolidayDay, HolidayYearData } from './holidays'
import type { CommitItem } from './models'
import { localDateKey } from './time-range'

export interface HolidayCalendar {
  days: Map<string, HolidayDay>
  years: Set<number>
}

export interface HolidayActivityStats {
  workdayCount: number
  restDayCount: number
  unknownDayCount: number
}

export type HolidayDateKind = 'workday' | 'restDay' | 'unknown'

export function createHolidayCalendar(data: HolidayYearData[]): HolidayCalendar {
  const calendar: HolidayCalendar = { days: new Map(), years: new Set() }
  for (const year of [...data].sort((a, b) => a.year - b.year)) {
    if (year.days.length === 0 || year.papers.length === 0) continue
    calendar.years.add(year.year)
    for (const day of year.days) calendar.days.set(day.date, day)
  }
  return calendar
}

export function classifyHolidayDate(date: string, calendar: HolidayCalendar): HolidayDateKind {
  const exception = calendar.days.get(date)
  if (exception) return exception.isOffDay ? 'restDay' : 'workday'

  const year = Number(date.slice(0, 4))
  if (!calendar.years.has(year) || (date.slice(5, 7) === '12' && !calendar.years.has(year + 1))) {
    return 'unknown'
  }

  const [yearPart, monthPart, dayPart] = date.split('-').map(Number)
  const weekday = new Date(yearPart, monthPart - 1, dayPart, 12).getDay()
  return weekday === 0 || weekday === 6 ? 'restDay' : 'workday'
}

export function filterRestDayCommits(
  commits: CommitItem[],
  calendar: HolidayCalendar
): CommitItem[] {
  return commits.filter(
    (commit) => classifyHolidayDate(localDateKey(commit.authoredAt), calendar) !== 'restDay'
  )
}

export function computeHolidayActivityStats(
  commits: CommitItem[],
  calendar: HolidayCalendar
): HolidayActivityStats {
  const stats = { workdayCount: 0, restDayCount: 0, unknownDayCount: 0 }
  const activeDates = new Set(commits.map((commit) => localDateKey(commit.authoredAt)))
  for (const date of activeDates) {
    const kind = classifyHolidayDate(date, calendar)
    stats[
      kind === 'unknown' ? 'unknownDayCount' : kind === 'restDay' ? 'restDayCount' : 'workdayCount'
    ] += 1
  }
  return stats
}
