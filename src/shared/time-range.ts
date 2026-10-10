import type { ResolvedTimeRange, TimeRangeState } from './models'

function startOfLocalDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0)
}

function startOfWeekMonday(date: Date): Date {
  const day = date.getDay()
  const offset = day === 0 ? -6 : 1 - day
  const monday = new Date(date.getFullYear(), date.getMonth(), date.getDate() + offset)
  return startOfLocalDay(monday)
}

function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1, 0, 0, 0, 0)
}

function formatDateTime(date: Date): string {
  const pad = (n: number): string => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`
}

function formatTimeRangeLabel(start: Date, end: Date, timezone: string): string {
  return `${formatDateTime(start)} ～ ${formatDateTime(end)}（${timezone}）`
}

export function localDateKey(value: string | Date): string {
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) {
    throw new Error('无效日期')
  }
  const pad = (n: number): string => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

export function getTimezoneName(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone || 'Local'
}

export function resolveTimeRange(state: TimeRangeState, now = new Date()): ResolvedTimeRange {
  const timezone = getTimezoneName()

  if (state.preset === 'custom') {
    if (!state.customStart || !state.customEnd) {
      throw new Error('自定义时间范围缺少起止日期')
    }
    const start = new Date(state.customStart)
    const end = new Date(state.customEnd)
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
      throw new Error('自定义时间范围无效')
    }
    if (!(start.getTime() < end.getTime())) {
      throw new Error('开始时间必须早于结束时间')
    }
    return {
      start,
      end,
      label: formatTimeRangeLabel(start, end, timezone),
      timezone
    }
  }

  if (state.preset === 'thisWeek') {
    const start = startOfWeekMonday(now)
    const end = new Date(start.getFullYear(), start.getMonth(), start.getDate() + 7)
    return {
      start,
      end,
      label: formatTimeRangeLabel(start, new Date(end.getTime() - 1), timezone),
      timezone
    }
  }

  if (state.preset === 'lastWeek') {
    const thisMonday = startOfWeekMonday(now)
    const start = new Date(thisMonday)
    start.setDate(start.getDate() - 7)
    return {
      start,
      end: thisMonday,
      label: formatTimeRangeLabel(start, new Date(thisMonday.getTime() - 1), timezone),
      timezone
    }
  }

  if (state.preset === 'thisMonth') {
    const start = startOfMonth(now)
    const end = new Date(start.getFullYear(), start.getMonth() + 1, 1)
    return {
      start,
      end,
      label: formatTimeRangeLabel(start, new Date(end.getTime() - 1), timezone),
      timezone
    }
  }

  const thisMonthStart = startOfMonth(now)
  const start = new Date(thisMonthStart.getFullYear(), thisMonthStart.getMonth() - 1, 1, 0, 0, 0, 0)
  return {
    start,
    end: thisMonthStart,
    label: formatTimeRangeLabel(start, new Date(thisMonthStart.getTime() - 1), timezone),
    timezone
  }
}

/** 自定义日期选择：开始日 00:00:00，结束日 23:59:59 */
export function customDayBounds(startDate: Date, endDate: Date): { start: Date; end: Date } {
  const start = new Date(
    startDate.getFullYear(),
    startDate.getMonth(),
    startDate.getDate(),
    0,
    0,
    0,
    0
  )
  const end = new Date(
    endDate.getFullYear(),
    endDate.getMonth(),
    endDate.getDate(),
    23,
    59,
    59,
    999
  )
  return { start, end }
}

export function toGitDateArg(date: Date): string {
  const pad = (n: number): string => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
}
