import { useMemo, useState } from 'react'
import { Card, Empty, Tag } from 'antd'
import { Calendar } from 'lucide-react'
import dayjs from 'dayjs'
import { useTranslation } from 'react-i18next'
import type { CommitItem } from '@shared/models'
import { localDateKey } from '@shared/time-range'
import { CommitRow } from '../commits/CommitRow'
import { CommitDetailsModal } from '../commits/CommitDetailsModal'

interface AggregatedCommitFeedProps {
  commits: CommitItem[]
}

export function AggregatedCommitFeed({ commits }: AggregatedCommitFeedProps): React.JSX.Element {
  const { t } = useTranslation()
  const [selectedCommit, setSelectedCommit] = useState<CommitItem | null>(null)

  // 按日期（天）聚合提交
  const dayGroups = useMemo(() => {
    const commitsByDay = Map.groupBy(commits, (commit) => localDateKey(commit.authoredAt))

    // 默认按日期降序排列
    return Array.from(commitsByDay.entries())
      .sort((a, b) => b[0].localeCompare(a[0]))
      .map(([dayKey, dayCommits]) => ({
        dayKey,
        dateFormatted: dayjs(dayKey).format('YYYY-MM-DD dddd'),
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
      <div className="flex flex-col gap-5 mt-3">
        {dayGroups.map((group) => (
          <div key={group.dayKey} className="flex flex-col gap-2">
            {/* 日期吸顶标题 */}
            <div className="flex items-center gap-2 px-1 text-xs text-[var(--ant-color-text-secondary)] font-medium">
              <Calendar size={14} className="text-[var(--ant-color-primary)]" />
              <span className="text-sm font-semibold text-[var(--ant-color-text)]">
                {group.dateFormatted}
              </span>
              <Tag bordered={false} className="m-0 font-mono text-xs">
                {group.commits.length} {t('stats.commits', { defaultValue: '次提交' })}
              </Tag>
            </div>

            {/* 当日提交列表卡片 */}
            <Card
              variant="outlined"
              className="shadow-xs bg-[var(--ant-color-bg-container)] overflow-hidden"
              styles={{ body: { padding: '8px 16px' } }}
            >
              <div className="divide-y divide-[var(--ant-color-border-secondary)]">
                {group.commits.map((commit) => (
                  <CommitRow
                    key={`${commit.repoId ?? commit.repoName ?? ''}\u0000${commit.hash}`}
                    commit={commit}
                    onSelect={setSelectedCommit}
                  />
                ))}
              </div>
            </Card>
          </div>
        ))}
      </div>
      <CommitDetailsModal commit={selectedCommit} onClose={() => setSelectedCommit(null)} />
    </>
  )
}
