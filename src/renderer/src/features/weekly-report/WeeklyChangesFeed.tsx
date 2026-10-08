import { useMemo, useState } from 'react'
import { Card, Empty, Tag } from 'antd'
import { Calendar } from 'lucide-react'
import dayjs from 'dayjs'
import { useTranslation } from 'react-i18next'
import type { CommitItem } from '@shared/models'
import { localDateKey } from '@shared/time-range'
import { CommitRow } from '../commits/CommitRow'
import { CommitDetailsModal } from '../commits/CommitDetailsModal'
import type { HolidayCalendar } from '@shared/holiday-calendar'
import { HolidayDateTag } from '@renderer/components/HolidayDateTag'

interface WeeklyChangesFeedProps {
  commits: CommitItem[]
  holidayCalendar: HolidayCalendar
}

interface DayGroup {
  dayKey: string
  dateFormatted: string
  totalCommits: number
  repoCount: number
  commits: CommitItem[]
}

export function WeeklyChangesFeed({
  commits,
  holidayCalendar
}: WeeklyChangesFeedProps): React.JSX.Element {
  const { t } = useTranslation()
  const [selection, setSelection] = useState<{ commit: CommitItem; filePath?: string } | null>(null)

  const dayGroups: DayGroup[] = useMemo(() => {
    const commitsByDay = Map.groupBy(
      [...commits].sort((a, b) => Date.parse(b.authoredAt) - Date.parse(a.authoredAt)),
      (commit) => localDateKey(commit.authoredAt)
    )

    return Array.from(commitsByDay.entries())
      .sort(([leftDay], [rightDay]) => rightDay.localeCompare(leftDay))
      .map(([dayKey, dayCommits]) => ({
        dayKey,
        dateFormatted: dayjs(dayKey).format('YYYY-MM-DD dddd'),
        totalCommits: dayCommits.length,
        repoCount: new Set(dayCommits.map((commit) => commit.repoId || commit.repoName)).size,
        commits: dayCommits
      }))
  }, [commits])

  if (commits.length === 0) {
    return (
      <Card
        variant="borderless"
        className="shadow-xs bg-[var(--ant-color-bg-container)] p-8 text-center mt-2"
      >
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description={t('thisWeek.noCommits', { defaultValue: '当前筛选范围内无提交记录' })}
        />
      </Card>
    )
  }

  return (
    <>
      <div className="flex flex-col gap-6 mt-3">
        {dayGroups.map((dayGroup) => (
          <div key={dayGroup.dayKey} className="flex flex-col gap-3">
            <div className="flex flex-wrap items-center gap-2 px-1 text-xs font-medium">
              <Calendar size={15} className="text-[var(--ant-color-primary)] shrink-0" />
              <span className="text-sm font-semibold text-[var(--ant-color-text)]">
                {dayGroup.dateFormatted}
              </span>
              <HolidayDateTag date={dayGroup.dayKey} calendar={holidayCalendar} />
              <Tag bordered={false} className="m-0 font-mono text-xs">
                {dayGroup.totalCommits} {t('stats.commits', { defaultValue: '次提交' })}
              </Tag>
              <Tag color="blue" bordered={false} className="m-0 font-mono text-xs">
                {dayGroup.repoCount} {t('stats.activeRepos', { defaultValue: '个工程' })}
              </Tag>
            </div>

            <Card
              variant="outlined"
              className="shadow-xs bg-[var(--ant-color-bg-container)] overflow-hidden"
              styles={{ body: { padding: '8px 16px' } }}
            >
              <div className="divide-y divide-[var(--ant-color-border-secondary)]">
                {dayGroup.commits.map((commit) => (
                  <CommitRow
                    key={`${commit.repoId ?? commit.repoName ?? ''}\u0000${commit.hash}`}
                    commit={commit}
                    onSelect={(commit, filePath) => setSelection({ commit, filePath })}
                    showRepo
                  />
                ))}
              </div>
            </Card>
          </div>
        ))}
      </div>
      <CommitDetailsModal
        commit={selection?.commit ?? null}
        focusedFilePath={selection?.filePath}
        onClose={() => setSelection(null)}
      />
    </>
  )
}
