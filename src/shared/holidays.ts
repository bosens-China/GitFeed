export interface HolidayDay {
  name: string
  date: string
  isOffDay: boolean
}

export interface HolidayYearData {
  year: number
  papers: string[]
  days: HolidayDay[]
}

export interface HolidayYearStatus {
  year: number
  source: 'bundled' | 'cached' | 'unavailable'
  dayCount: number
  checkedAt?: string
  checkResult?: 'ready' | 'unpublished' | 'error'
}

export interface HolidayStatus {
  autoUpdate: boolean
  checking: boolean
  years: HolidayYearStatus[]
}
