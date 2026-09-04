import { useMemo, useState } from 'react'
import { Button, Card, Collapse, Empty, Space, Tag, Tooltip, Typography } from 'antd'
import { Calendar, FileText, FolderGit2, GitBranch, GitMerge } from 'lucide-react'
import dayjs from 'dayjs'
import { useTranslation } from 'react-i18next'
import type { CommitItem } from '@shared/models'
import { parseCommitCategory } from '@shared/commit-category'
import { localDateKey } from '@shared/time-range'
import { CursorTooltip } from '@renderer/components/CursorTooltip'
import { CommitDetailsModal } from '../commits/CommitDetailsModal'

interface AggregatedCommitFeedProps {
  commits: CommitItem[]
  showRepoTag?: boolean
}

function formatTime(iso: string): string {
  const date = new Date(iso)
  const pad = (n: number): string => String(n).padStart(2, '0')
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`
}

export function AggregatedCommitFeed({
  commits,
  showRepoTag = false
}: AggregatedCommitFeedProps): React.JSX.Element {
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
                {group.commits.map((commit) => {
                  const totalAdd = commit.files.reduce((sum, f) => sum + (f.additions ?? 0), 0)
                  const totalDel = commit.files.reduce((sum, f) => sum + (f.deletions ?? 0), 0)

                  const category = parseCommitCategory(commit.message)

                  return (
                    <CursorTooltip
                      key={`${commit.repoId ?? commit.repoName ?? ''}\u0000${commit.hash}`}
                      title={dayjs(commit.authoredAt).format('YYYY-MM-DD HH:mm:ss')}
                    >
                      <div className="group/commit relative py-2.5 px-3.5 -mx-3.5 rounded-lg border border-transparent hover:border-[var(--ant-color-border-secondary)] hover:bg-[var(--ant-color-fill-secondary)] transition-all duration-150 flex flex-col gap-1.5 cursor-default">
                        {/* 提交标题行 */}
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-start gap-2 min-w-0">
                            <Tag
                              color={category.color}
                              bordered={false}
                              className="mt-0.5 text-[11px] font-medium shrink-0 flex items-center gap-1 cursor-default"
                            >
                              <span>{category.emoji}</span>
                              <span>{category.label}</span>
                            </Tag>
                            <Typography.Text
                              strong
                              className="text-sm font-medium leading-snug break-words text-[var(--ant-color-text)] cursor-default"
                            >
                              {commit.message}
                            </Typography.Text>
                          </div>

                          {/* 时间与 Hash */}
                          <Space size={4} className="shrink-0">
                            <Typography.Text
                              type="secondary"
                              className="font-mono text-xs cursor-default"
                            >
                              {formatTime(commit.authoredAt)}
                            </Typography.Text>
                            <Tooltip
                              title={t('commitDetails.openTooltip', {
                                hash: commit.shortHash,
                                defaultValue: `查看提交 ${commit.shortHash} 的详情与 Diff`
                              })}
                            >
                              <Button
                                size="small"
                                type="link"
                                onClick={() => setSelectedCommit(commit)}
                                className="font-mono text-xs !h-6 px-1.5"
                              >
                                {commit.shortHash}
                              </Button>
                            </Tooltip>
                          </Space>
                        </div>

                        {/* 提交元数据标签行 */}
                        <div className="flex flex-wrap items-center gap-2 pl-6 text-xs text-[var(--ant-color-text-tertiary)]">
                          {showRepoTag && (
                            <Tag
                              color="cyan"
                              bordered={false}
                              className="m-0 flex items-center gap-1 text-[11px]"
                            >
                              <FolderGit2 size={11} />
                              {commit.repoName}
                            </Tag>
                          )}

                          <Tag
                            bordered={false}
                            className="m-0 flex items-center gap-1 text-[11px] font-mono text-[var(--ant-color-text-secondary)]"
                          >
                            <GitBranch size={11} />
                            {commit.branch}
                          </Tag>

                          {commit.isMerge && (
                            <Tag color="purple" bordered={false} className="m-0 text-[11px]">
                              <GitMerge size={11} className="inline mr-0.5" />
                              Merge
                            </Tag>
                          )}

                          <span>{commit.authorName}</span>

                          {commit.files.length > 0 && (
                            <Space size={4} className="font-mono text-xs ml-auto">
                              <span className="text-emerald-500 font-medium">+{totalAdd}</span>
                              <span className="text-rose-500 font-medium">-{totalDel}</span>
                            </Space>
                          )}
                        </div>

                        {/* 变更文件折叠面板 */}
                        {commit.files.length > 0 && (
                          <div className="pl-6 pt-1">
                            <Collapse
                              ghost
                              size="small"
                              items={[
                                {
                                  key: 'files',
                                  label: (
                                    <span className="text-xs text-[var(--ant-color-text-tertiary)] hover:text-[var(--ant-color-primary)]">
                                      {t('commitList.fileChanges', {
                                        count: commit.files.length,
                                        defaultValue: `${commit.files.length} 个文件变更`
                                      })}
                                    </span>
                                  ),
                                  children: (
                                    <ul className="flex flex-col gap-1 pl-1 m-0 list-none font-mono text-xs">
                                      {commit.files.map((f, fIdx) => (
                                        <li
                                          key={fIdx}
                                          className="flex items-center justify-between gap-2 py-1 px-1.5 rounded hover:bg-[var(--ant-color-fill-secondary)] transition-colors group"
                                        >
                                          <span className="flex items-center gap-1.5 truncate">
                                            <FileText
                                              size={12}
                                              className="text-[var(--ant-color-text-quaternary)] group-hover:text-[var(--ant-color-primary)] shrink-0 transition-colors"
                                            />
                                            <Tag
                                              color={
                                                f.status === 'A'
                                                  ? 'green'
                                                  : f.status === 'D'
                                                    ? 'red'
                                                    : 'blue'
                                              }
                                              className="m-0 px-1 py-0 text-[10px] uppercase font-semibold"
                                            >
                                              {f.status}
                                            </Tag>
                                            <span
                                              className="truncate text-[var(--ant-color-text-secondary)] group-hover:text-[var(--ant-color-primary)] transition-colors"
                                              title={f.path}
                                            >
                                              {f.path}
                                            </span>
                                          </span>
                                          <span className="shrink-0 text-right text-[11px] flex items-center gap-1.5">
                                            {f.additions !== null && (
                                              <span className="text-emerald-500 font-medium">
                                                +{f.additions}
                                              </span>
                                            )}
                                            {f.deletions !== null && (
                                              <span className="text-rose-500 font-medium">
                                                -{f.deletions}
                                              </span>
                                            )}
                                          </span>
                                        </li>
                                      ))}
                                    </ul>
                                  )
                                }
                              ]}
                            />
                          </div>
                        )}
                      </div>
                    </CursorTooltip>
                  )
                })}
              </div>
            </Card>
          </div>
        ))}
      </div>
      <CommitDetailsModal commit={selectedCommit} onClose={() => setSelectedCommit(null)} />
    </>
  )
}
