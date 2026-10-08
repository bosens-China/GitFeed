import fs from 'node:fs/promises'
import path from 'node:path'
import { app } from 'electron'
import type { HolidayStatus, HolidayYearData } from '@shared/holidays'
import bundled2026 from './2026.json'

interface StoredYear {
  data: HolidayYearData
  updatedAt: string
}

interface StoredCheck {
  checkedAt: string
  result: 'ready' | 'unpublished' | 'error'
}

interface HolidayStore {
  autoUpdate: boolean
  years: Record<string, StoredYear>
  checks: Record<string, StoredCheck>
}

const BUNDLED_YEAR = 2026
const BUNDLED_2026 = parseHolidayYear(bundled2026, BUNDLED_YEAR)
const DATA_URL = 'https://cdn.jsdelivr.net/gh/NateScarlet/holiday-cn@master'
let mutationQueue: Promise<void> = Promise.resolve()
let checkInFlight: Promise<void> | null = null

function storePath(): string {
  return path.join(app.getPath('userData'), 'holidays.json')
}

function emptyStore(): HolidayStore {
  return { autoUpdate: true, years: {}, checks: {} }
}

export function parseHolidayYear(value: unknown, expectedYear: number): HolidayYearData {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('节假日数据格式无效')
  }
  const input = value as Record<string, unknown>
  if (
    input.year !== expectedYear ||
    !Array.isArray(input.papers) ||
    input.papers.length > 10 ||
    !input.papers.every(
      (paper) => typeof paper === 'string' && paper.length > 0 && paper.length <= 2048
    ) ||
    !Array.isArray(input.days) ||
    input.days.length > 400
  ) {
    throw new Error('节假日数据格式无效')
  }

  const days = input.days.map((value) => {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      throw new Error('节假日日期格式无效')
    }
    const day = value as Record<string, unknown>
    if (
      typeof day.name !== 'string' ||
      !day.name.trim() ||
      day.name.length > 100 ||
      typeof day.date !== 'string' ||
      !/^\d{4}-\d{2}-\d{2}$/u.test(day.date) ||
      !Number.isFinite(Date.parse(`${day.date}T00:00:00Z`)) ||
      new Date(`${day.date}T00:00:00Z`).toISOString().slice(0, 10) !== day.date ||
      typeof day.isOffDay !== 'boolean'
    ) {
      throw new Error('节假日日期格式无效')
    }
    return { name: day.name, date: day.date, isOffDay: day.isOffDay }
  })

  if (new Set(days.map((day) => day.date)).size !== days.length) {
    throw new Error('节假日日期重复')
  }
  if (days.length > 0 && input.papers.length === 0) {
    throw new Error('节假日数据缺少公告来源')
  }
  if (days.length === 0 && input.papers.length > 0) {
    throw new Error('节假日数据缺少日期')
  }
  return { year: expectedYear, papers: input.papers, days }
}

async function readStore(): Promise<HolidayStore> {
  let raw: string
  try {
    raw = await fs.readFile(storePath(), 'utf8')
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return emptyStore()
    throw error
  }

  try {
    const parsed: unknown = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error()
    const store = parsed as Record<string, unknown>
    if (
      typeof store.autoUpdate !== 'boolean' ||
      !store.years ||
      typeof store.years !== 'object' ||
      Array.isArray(store.years) ||
      !store.checks ||
      typeof store.checks !== 'object' ||
      Array.isArray(store.checks)
    ) {
      throw new Error()
    }
    for (const [year, value] of Object.entries(store.years)) {
      if (!/^\d{4}$/u.test(year) || !value || typeof value !== 'object') throw new Error()
      const saved = value as Record<string, unknown>
      if (typeof saved.updatedAt !== 'string') throw new Error()
      parseHolidayYear(saved.data, Number(year))
    }
    for (const value of Object.values(store.checks)) {
      if (!value || typeof value !== 'object') throw new Error()
      const check = value as Record<string, unknown>
      if (
        typeof check.checkedAt !== 'string' ||
        (check.result !== 'ready' && check.result !== 'unpublished' && check.result !== 'error')
      ) {
        throw new Error()
      }
    }
    return store as unknown as HolidayStore
  } catch {
    throw new Error('节假日缓存文件已损坏，已保留原文件')
  }
}

async function mutateStore(mutate: (store: HolidayStore) => void): Promise<void> {
  const result = mutationQueue.then(async () => {
    const store = await readStore()
    mutate(store)
    const file = storePath()
    await fs.mkdir(path.dirname(file), { recursive: true })
    await fs.writeFile(`${file}.tmp`, JSON.stringify(store, null, 2), 'utf8')
    await fs.rename(`${file}.tmp`, file)
  })
  mutationQueue = result.then(
    () => undefined,
    () => undefined
  )
  return result
}

export async function readHolidayYear(year: number): Promise<HolidayYearData | null> {
  if (year === BUNDLED_YEAR) return BUNDLED_2026
  const stored = (await readStore()).years[String(year)]
  return stored ? parseHolidayYear(stored.data, year) : null
}

export async function readHolidayCalendar(): Promise<HolidayYearData[]> {
  const store = await readStore()
  return [
    BUNDLED_2026,
    ...Object.entries(store.years)
      .filter(([year]) => Number(year) > BUNDLED_YEAR)
      .sort(([left], [right]) => Number(left) - Number(right))
      .map(([, value]) => value.data)
  ]
}

export async function getHolidayStatus(now = new Date()): Promise<HolidayStatus> {
  const store = await readStore()
  const years = [...new Set([BUNDLED_YEAR, now.getFullYear(), now.getFullYear() + 1])]
    .filter((year) => year >= BUNDLED_YEAR)
    .sort((a, b) => a - b)
    .map((year) => {
      const cached = store.years[String(year)]
      const checked = store.checks[String(year)]
      return {
        year,
        source:
          year === BUNDLED_YEAR
            ? ('bundled' as const)
            : cached
              ? ('cached' as const)
              : ('unavailable' as const),
        dayCount:
          year === BUNDLED_YEAR ? BUNDLED_2026.days.length : (cached?.data.days.length ?? 0),
        checkedAt: checked?.checkedAt,
        checkResult: checked?.result
      }
    })
  return { autoUpdate: store.autoUpdate, checking: checkInFlight !== null, years }
}

export async function setHolidayAutoUpdate(enabled: boolean): Promise<HolidayStatus> {
  await mutateStore((store) => {
    store.autoUpdate = enabled
  })
  return getHolidayStatus()
}

async function fetchHolidayYear(year: number): Promise<HolidayYearData | null> {
  let response: Response
  try {
    response = await fetch(`${DATA_URL}/${year}.json`, { signal: AbortSignal.timeout(10_000) })
  } catch {
    throw new Error(`${year} 年节假日数据连接失败`)
  }
  if (response.status === 404) return null
  if (!response.ok) throw new Error(`${year} 年节假日数据请求失败（HTTP ${response.status}）`)
  if (Number(response.headers.get('content-length')) > 100_000) {
    throw new Error(`${year} 年节假日数据过大`)
  }
  let value: unknown
  try {
    const body = await response.text()
    if (body.length > 100_000) throw new Error()
    value = JSON.parse(body)
  } catch {
    throw new Error(`${year} 年节假日数据格式无效`)
  }
  const data = parseHolidayYear(value, year)
  return data.days.length === 0 ? null : data
}

async function performCheck(now: Date): Promise<void> {
  const years = [...new Set([now.getFullYear(), now.getFullYear() + 1])].filter(
    (year) => year > BUNDLED_YEAR
  )
  const results = await Promise.allSettled(years.map(fetchHolidayYear))
  const checkedAt = new Date().toISOString()
  await mutateStore((store) => {
    years.forEach((year, index) => {
      const result = results[index]
      const key = String(year)
      if (result.status === 'rejected') {
        store.checks[key] = { checkedAt, result: 'error' }
      } else if (result.value === null) {
        store.checks[key] = { checkedAt, result: 'unpublished' }
      } else {
        store.years[key] = { data: result.value, updatedAt: checkedAt }
        store.checks[key] = { checkedAt, result: 'ready' }
      }
    })
  })
  const failures = results.filter((result) => result.status === 'rejected')
  if (failures.length > 0) {
    throw new Error(failures.map((result) => String(result.reason)).join('；'))
  }
}

export function checkHolidayUpdates(now = new Date()): Promise<void> {
  if (checkInFlight) return checkInFlight
  checkInFlight = performCheck(now).finally(() => {
    checkInFlight = null
  })
  return checkInFlight
}

export async function checkHolidayUpdatesIfEnabled(): Promise<void> {
  if ((await readStore()).autoUpdate) await checkHolidayUpdates()
}
