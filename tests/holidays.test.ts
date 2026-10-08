import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import {
  checkHolidayUpdates,
  checkHolidayUpdatesIfEnabled,
  getHolidayStatus,
  parseHolidayYear,
  readHolidayYear,
  setHolidayAutoUpdate
} from '../src/main/holidays'

const storage = vi.hoisted(() => ({ directory: '' }))
vi.mock('electron', () => ({ app: { getPath: () => storage.directory } }))

beforeEach(async () => {
  storage.directory = await fs.mkdtemp(path.join(os.tmpdir(), 'gitfeed-holidays-'))
})

afterEach(async () => {
  vi.unstubAllGlobals()
  await fs.rm(storage.directory, { recursive: true, force: true })
})

const current = new Date('2026-10-08T12:00:00+08:00')
const published2027 = {
  year: 2027,
  papers: ['https://www.gov.cn/example'],
  days: [{ name: '元旦', date: '2027-01-01', isOffDay: true }]
}

it('bundles 2026 without requesting it and treats an empty future year as unpublished', async () => {
  const fetchMock = vi.fn(
    async () => new Response(JSON.stringify({ year: 2027, papers: [], days: [] }), { status: 200 })
  )
  vi.stubGlobal('fetch', fetchMock)

  const bundled = await readHolidayYear(2026)
  expect(bundled?.days).toHaveLength(39)
  expect(bundled?.days.find((day) => day.date === '2026-01-04')?.isOffDay).toBe(false)
  await checkHolidayUpdates(current)

  expect(fetchMock).toHaveBeenCalledTimes(1)
  expect(fetchMock.mock.calls[0][0]).toContain('/2027.json')
  expect(await readHolidayYear(2027)).toBeNull()
  expect((await getHolidayStatus(current)).years).toMatchObject([
    { year: 2026, source: 'bundled' },
    { year: 2027, source: 'unavailable', checkResult: 'unpublished' }
  ])
})

it('checks both current and next year after 2026', async () => {
  const fetchMock = vi.fn(async () => new Response('', { status: 404 }))
  vi.stubGlobal('fetch', fetchMock)

  await checkHolidayUpdates(new Date('2027-01-02T12:00:00+08:00'))

  expect(fetchMock.mock.calls.map(([url]) => String(url))).toEqual([
    expect.stringContaining('/2027.json'),
    expect.stringContaining('/2028.json')
  ])
})

it('keeps cached data when a later check fails and respects the automatic-update switch', async () => {
  const fetchMock = vi.fn(async () => new Response(JSON.stringify(published2027), { status: 200 }))
  vi.stubGlobal('fetch', fetchMock)
  await checkHolidayUpdates(current)
  expect((await readHolidayYear(2027))?.days).toEqual(published2027.days)

  fetchMock.mockRejectedValueOnce(new Error('offline'))
  await expect(checkHolidayUpdates(current)).rejects.toThrow('连接失败')
  expect((await readHolidayYear(2027))?.days).toEqual(published2027.days)
  expect((await getHolidayStatus(current)).years[1]).toMatchObject({
    source: 'cached',
    checkResult: 'error'
  })

  await setHolidayAutoUpdate(false)
  fetchMock.mockClear()
  await checkHolidayUpdatesIfEnabled()
  expect(fetchMock).not.toHaveBeenCalled()
})

it('rejects invalid or duplicate dates before caching remote data', () => {
  expect(() =>
    parseHolidayYear(
      { ...published2027, days: [{ ...published2027.days[0], date: '2027-02-30' }] },
      2027
    )
  ).toThrow('日期格式无效')
  expect(() =>
    parseHolidayYear(
      { ...published2027, days: [published2027.days[0], published2027.days[0]] },
      2027
    )
  ).toThrow('日期重复')
})
