import { useMemo } from 'react'
import { App, Button, Card, Collapse, Empty, Space, Tag, Tooltip, Typography } from 'antd'
import { Calendar, Copy, FileText, FolderGit2, GitBranch, GitMerge } from 'lucide-react'
import dayjs from 'dayjs'
import { useTranslation } from 'react-i18next'
import type { CommitItem } from '@shared/models'
import { parseCommitCategory } from '@shared/commit-category'
import { localDateKey } from '@shared/time-range'

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

function formatTime(iso: string): string {
  const date = new Date(iso)
  const pad = (n: number): string => String(n).padStart(2, '0')
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`
}

export function WeeklyChangesFeed({ commits }: WeeklyChangesFeedProps): React.JSX.Element {
  const { t } = useTranslation()
  const { message } = App.useApp()

  const handleCopyHash = async (hash: string): Promise<void> => {
    try {
      await navigator.clipboard.writeText(hash)
      message.success(t('commitList.hashCopied', { defaultValue: '已复制完整 Hash' }))
    } catch {
      message.error(t('commitList.copyFailed', { defaultValue: '复制失败' }))
    }
  }

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
                      <FolderGit2 size={15} className="text-[var(--ant-color-primary)] shrink-0" />
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
                  {repoGroup.commits.map((commit) => {
                    const totalAdd = commit.files.reduce((sum, f) => sum + (f.additions ?? 0), 0)
                    const totalDel = commit.files.reduce((sum, f) => sum + (f.deletions ?? 0), 0)
                    const category = parseCommitCategory(commit.message)

                    return (
                      <div
                        key={commit.hash}
                        className="py-3 flex flex-col gap-1.5 transition-colors hover:bg-[var(--ant-color-fill-quaternary)] -mx-4 px-4 rounded"
                      >
                        {/* 提交标题与类别 */}
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-start gap-2 min-w-0">
                            <Tag
                              color={category.color}
                              bordered={false}
                              className="mt-0.5 text-[11px] font-medium shrink-0 flex items-center gap-1"
                            >
                              <span>{category.emoji}</span>
                              <span>{category.label}</span>
                            </Tag>
                            <Typography.Text
                              strong
                              className="text-sm font-medium leading-snug break-words text-[var(--ant-color-text)]"
                            >
                              {commit.message}
                            </Typography.Text>
                          </div>

                          <Space size={4} className="shrink-0">
                            <Typography.Text type="secondary" className="font-mono text-xs">
                              {formatTime(commit.authoredAt)}
                            </Typography.Text>
                            <Tooltip
                              title={t('commitList.copyHashTooltip', {
                                defaultValue: '点击复制完整 Hash'
                              })}
                            >
                              <Button
                                size="small"
                                type="text"
                                icon={<Copy size={11} />}
                                onClick={() => void handleCopyHash(commit.hash)}
                                className="font-mono text-xs !h-6 px-1.5 text-[var(--ant-color-text-secondary)]"
                              >
                                {commit.shortHash}
                              </Button>
                            </Tooltip>
                          </Space>
                        </div>

                        {/* 元数据标签 */}
                        <div className="flex flex-wrap items-center gap-2 pl-6 text-xs text-[var(--ant-color-text-tertiary)]">
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

                        {/* 变更文件 */}
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
                    )
                  })}
                </div>
              </Card>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
