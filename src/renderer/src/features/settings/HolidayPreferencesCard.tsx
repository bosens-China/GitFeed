import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Alert, App, Button, Card, Space, Spin, Switch, Tag } from 'antd'
import { CalendarDays, RefreshCw } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import type { HolidayYearStatus } from '@shared/holidays'
import { holidayCalendarKey } from '@renderer/hooks/useHolidayCalendar'

export function HolidayPreferencesCard(): React.JSX.Element {
  const { t, i18n } = useTranslation()
  const { message } = App.useApp()
  const queryClient = useQueryClient()
  const [updating, setUpdating] = useState(false)
  const [saving, setSaving] = useState(false)
  const { data, error, isLoading, refetch } = useQuery({
    queryKey: ['holiday-status'],
    queryFn: () => window.api.getHolidayStatus(),
    refetchInterval: (query) => (query.state.data?.checking ? 1000 : 15_000)
  })

  const changeAutoUpdate = async (enabled: boolean): Promise<void> => {
    setSaving(true)
    try {
      await window.api.setHolidayAutoUpdate(enabled)
      await refetch()
    } catch {
      message.error(t('settings.holidaySaveFailed'))
    } finally {
      setSaving(false)
    }
  }

  const checkNow = async (): Promise<void> => {
    setUpdating(true)
    try {
      const result = await window.api.checkHolidayUpdates()
      if (result.years.some((year) => year.checkResult === 'unpublished')) {
        message.info(t('settings.holidayNotPublished'))
      } else {
        message.success(t('settings.holidayChecked'))
      }
    } catch {
      message.error(t('settings.holidayCheckFailed'))
    } finally {
      setUpdating(false)
      void refetch()
      void queryClient.invalidateQueries({ queryKey: holidayCalendarKey })
    }
  }

  const yearLabel = (year: HolidayYearStatus): string => {
    if (year.source === 'bundled') return t('settings.holidayBundled')
    if (year.checkResult === 'error') return t('settings.holidayError')
    if (year.source === 'cached') return t('settings.holidayCached')
    if (year.checkResult === 'unpublished') return t('settings.holidayNotPublished')
    return t('settings.holidayWaiting')
  }

  return (
    <Card
      title={
        <Space size={8}>
          <CalendarDays size={18} className="text-[var(--ant-color-primary)]" />
          <span>{t('settings.holidayTitle')}</span>
        </Space>
      }
    >
      {isLoading ? (
        <Spin size="small" />
      ) : error ? (
        <Alert type="error" showIcon message={t('settings.holidayCacheError')} />
      ) : data ? (
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="text-sm font-medium">{t('settings.holidayAutoUpdate')}</div>
              <div className="text-xs text-[var(--ant-color-text-secondary)]">
                {t('settings.holidayAutoUpdateDesc')}
              </div>
            </div>
            <Switch
              checked={data.autoUpdate}
              loading={saving}
              onChange={(enabled) => void changeAutoUpdate(enabled)}
              aria-label={t('settings.holidayAutoUpdate')}
            />
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--ant-color-border-secondary)] pt-4">
            <div className="flex flex-wrap items-center gap-2">
              {data.years.map((year) => (
                <Tag
                  key={year.year}
                  color={
                    year.checkResult === 'error'
                      ? 'red'
                      : year.source === 'unavailable'
                        ? 'gold'
                        : 'green'
                  }
                >
                  {year.year} · {yearLabel(year)}
                  {year.checkedAt
                    ? ` · ${new Date(year.checkedAt).toLocaleString(i18n.language)}`
                    : ''}
                </Tag>
              ))}
            </div>
            <Button
              icon={<RefreshCw size={14} />}
              loading={updating || data.checking}
              onClick={() => void checkNow()}
            >
              {t('settings.holidayCheckNow')}
            </Button>
          </div>
        </div>
      ) : null}
    </Card>
  )
}
