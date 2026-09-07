import { useMemo, useState } from 'react'
import { Card, Empty, Tag } from 'antd'
import { Calendar, FolderGit2 } from 'lucide-react'
import dayjs from 'dayjs'
import { useTranslation } from 'react-i18next'
import type { CommitItem } from '@shared/models'
import { localDateKey } from '@shared/time-range'
import { CommitRow } from '../commits/CommitRow'
import { CommitDetailsModal } from '../commits/CommitDetailsModal'

interface WeeklyChangesFeedProps {
  commits: CommitItem[]
}

interface RepoGroup {
  repoId: string
  repoName: string
  commits: CommitItem[]
}

interface DayGroup {
  dayKey: string
  dateFormatted: string
  totalCommits: number
  repos: RepoGroup[]
}

export function WeeklyChangesFeed({ commits }: WeeklyChangesFeedProps): React.JSX.Element {
  const { t } = useTranslation()
  const [selectedCommit, setSelectedCommit] = useState<CommitItem | null>(null)

  // 三层组织：日期 (Level 1) -> 工程项目 (Level 2) -> 提交项 (Level 3)
  const dayGroups: DayGroup[] = useMemo(() => {
    const commitsByDay = Map.groupBy(commits, (commit) => localDateKey(commit.authoredAt))

    return Array.from(commitsByDay.entries())
      .sort(([leftDay], [rightDay]) => rightDay.localeCompare(leftDay))
      .map(([dayKey, dayCommits]) => {
        const repos: RepoGroup[] = Array.from(
          Map.groupBy(dayCommits, (commit) => commit.repoId || commit.repoName || 'unknown')
        )
          .map(([repoId, repoCommits]) => ({
            repoId,
            repoName: repoCommits[0]?.repoName || repoId,
            commits: repoCommits
          }))
          .sort((a, b) => a.repoName.localeCompare(b.repoName))

        const totalCommits = repos.reduce((sum, r) => sum + r.commits.length, 0)

        return {
          dayKey,
          dateFormatted: dayjs(dayKey).format('YYYY-MM-DD dddd'),
          totalCommits,
          repos
        }
      })
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
            {/* Level 1: 日期聚合吸顶 */}
            <div className="flex items-center gap-2 px-1 text-xs font-medium">
              <Calendar size={15} className="text-[var(--ant-color-primary)] shrink-0" />
              <span className="text-sm font-semibold text-[var(--ant-color-text)]">
                {dayGroup.dateFormatted}
              </span>
              <Tag bordered={false} className="m-0 font-mono text-xs">
                {dayGroup.totalCommits} {t('stats.commits', { defaultValue: '次提交' })}
              </Tag>
              <Tag color="blue" bordered={false} className="m-0 font-mono text-xs">
                {dayGroup.repos.length} {t('stats.activeRepos', { defaultValue: '个工程' })}
              </Tag>
            </div>

            {/* Level 2: 工程项目列表 */}
            <div className="flex flex-col gap-3">
              {dayGroup.repos.map((repoGroup) => (
                <Card
                  key={repoGroup.repoId}
                  variant="outlined"
                  className="shadow-xs bg-[var(--ant-color-bg-container)] overflow-hidden"
                  styles={{
                    header: {
                      minHeight: 40,
                      padding: '0 16px',
                      background: 'var(--ant-color-fill-quaternary)'
                    },
                    body: { padding: '8px 16px' }
                  }}
                  title={
                    <div className="flex items-center justify-between py-1">
                      <div className="flex items-center gap-2 min-w-0">
                        <FolderGit2
                          size={15}
                          className="text-[var(--ant-color-primary)] shrink-0"
                        />
                        <span className="font-semibold text-sm text-[var(--ant-color-text)] truncate">
                          {repoGroup.repoName}
                        </span>
                      </div>
                      <Tag bordered={false} className="m-0 font-mono text-xs">
                        {repoGroup.commits.length} {t('stats.commits', { defaultValue: '次提交' })}
                      </Tag>
                    </div>
                  }
                >
                  {/* Level 3: 工程下的具体提交列表 */}
                  <div className="divide-y divide-[var(--ant-color-border-secondary)]">
                    {repoGroup.commits.map((commit) => (
                      <CommitRow
                        key={`${commit.repoId ?? commit.repoName ?? ''}\u0000${commit.hash}`}
                        commit={commit}
                        onSelect={setSelectedCommit}
                      />
                    ))}
                  </div>
                </Card>
              ))}
            </div>
          </div>
        ))}
      </div>
      <CommitDetailsModal commit={selectedCommit} onClose={() => setSelectedCommit(null)} />
    </>
  )
}
