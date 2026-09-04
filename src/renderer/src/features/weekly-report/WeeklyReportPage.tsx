import { useMemo, useState } from 'react'
import {
  Alert,
  App,
  Button,
  Card,
  DatePicker,
  Empty,
  Input,
  Segmented,
  Space,
  Spin,
  Tabs,
  Tag,
  Tooltip
} from 'antd'
import { Copy, FileText, GitCommit, RefreshCw, Search } from 'lucide-react'
import dayjs, { type Dayjs } from 'dayjs'
import isoWeek from 'dayjs/plugin/isoWeek'
import { useTranslation } from 'react-i18next'
import { buildCommitsWeeklyReportMarkdown } from '@shared/markdown'
import {
  authorKey,
  defaultSelectedAuthorKeys,
  type AuthorIdentity,
  type CommitItem,
  type TimeRangePreset,
  type TimeRangeState
} from '@shared/models'
import { customDayBounds, localDateKey } from '@shared/time-range'
import { useWeeklyActivity, useWorkbench } from '@renderer/hooks/useWorkbench'
import { WeeklyChangesFeed } from './WeeklyChangesFeed'
import { StatsHeader } from '../this-week/StatsHeader'
import { MarkdownReportPreview } from '../this-week/MarkdownReportPreview'
import { ClosingMultiSelect } from '@renderer/components/ClosingMultiSelect'

dayjs.extend(isoWeek)

interface WeeklyReportPageProps {
  onNavigateToThisWeek?: () => void
}

export function WeeklyReportPage({
  onNavigateToThisWeek
}: WeeklyReportPageProps = {}): React.JSX.Element {
  const { t } = useTranslation()
  const { message } = App.useApp()
  const { state: workbench } = useWorkbench()

  const [timeRange, setTimeRange] = useState<TimeRangeState>({ preset: 'thisWeek' })
  const [selectedAuthors, setSelectedAuthors] = useState<string[] | null>(null)
  const [searchKeyword, setSearchKeyword] = useState<string>('')
  const [activeTabKey, setActiveTabKey] = useState<'report' | 'changes'>('report')

  const { data: activityData, isFetching, isLoading, refetch, error } = useWeeklyActivity(timeRange)

  const timeRangeOptions = [
    { label: t('filterBar.thisWeek', { defaultValue: '本周' }), value: 'thisWeek' },
    { label: t('filterBar.lastWeek', { defaultValue: '上周' }), value: 'lastWeek' },
    { label: t('filterBar.lastMonth', { defaultValue: '上个月' }), value: 'lastMonth' },
    { label: t('filterBar.custom', { defaultValue: '自定义' }), value: 'custom' }
  ]

  const customRangeValue: [Dayjs, Dayjs] | null =
    timeRange.preset === 'custom' && timeRange.customStart && timeRange.customEnd
      ? [dayjs(timeRange.customStart), dayjs(timeRange.customEnd)]
      : null

  const availableAuthors = useMemo((): AuthorIdentity[] => {
    const allCommits = activityData?.allCommits ?? []
    const authors = new Map<string, AuthorIdentity>()
    for (const c of allCommits) {
      const author = { name: c.authorName, email: c.authorEmail }
      if (author.name) authors.set(authorKey(author), author)
    }
    return Array.from(authors.values()).sort((a, b) => a.name.localeCompare(b.name))
  }, [activityData?.allCommits])

  const authorOptions = useMemo(
    () =>
      availableAuthors.map((author) => ({
        label: author.email ? `${author.name} <${author.email}>` : author.name,
        value: authorKey(author)
      })),
    [availableAuthors]
  )

  const effectiveSelectedAuthors = useMemo(
    () =>
      selectedAuthors ?? defaultSelectedAuthorKeys(availableAuthors, workbench?.myIdentities ?? []),
    [availableAuthors, selectedAuthors, workbench?.myIdentities]
  )

  const filteredCommits = useMemo((): CommitItem[] => {
    const allCommits = activityData?.allCommits ?? []
    return allCommits.filter((c) => {
      if (
        effectiveSelectedAuthors.length > 0 &&
        !effectiveSelectedAuthors.includes(authorKey({ name: c.authorName, email: c.authorEmail }))
      ) {
        return false
      }
      if (!searchKeyword.trim()) return true
      const kw = searchKeyword.toLowerCase()
      return (
        c.message.toLowerCase().includes(kw) ||
        c.shortHash.toLowerCase().includes(kw) ||
        (c.repoName && c.repoName.toLowerCase().includes(kw))
      )
    })
  }, [activityData?.allCommits, effectiveSelectedAuthors, searchKeyword])

  const enabledRepos = useMemo(
    () => (workbench?.repositories ?? []).filter((r) => r.enabledForReport),
    [workbench?.repositories]
  )

  const markdownText = useMemo(() => {
    return buildCommitsWeeklyReportMarkdown(filteredCommits, {
      title: '全仓工作周报',
      timeRangeLabel: activityData?.timeRange.label,
      groupMode: 'byRepo'
    })
  }, [filteredCommits, activityData?.timeRange.label])

  const handleCopyMarkdown = async (): Promise<void> => {
    if (!markdownText.trim()) {
      message.info(t('weeklyReport.copyEmptyWarning', { defaultValue: '周报内容为空，无法复制' }))
      return
    }
    try {
      await navigator.clipboard.writeText(markdownText)
      message.success(
        t('workbench.copySuccess', { defaultValue: '已成功复制全仓周报 Markdown 到剪贴板。' })
      )
    } catch {
      message.error(t('workbench.copyFailed', { defaultValue: '复制失败' }))
    }
  }

  const filteredStats = useMemo(() => {
    let add = 0
    let del = 0
    const files = new Set<string>()
    const days = new Set<string>()
    const repos = new Set<string>()

    for (const c of filteredCommits) {
      days.add(localDateKey(c.authoredAt))
      if (c.repoId || c.repoName) {
        repos.add(c.repoId || c.repoName!)
      }
      for (const f of c.files) {
        files.add(`${c.repoId ?? c.repoName ?? ''}\u0000${f.path}`)
        if (f.additions) add += f.additions
        if (f.deletions) del += f.deletions
      }
    }

    return {
      commitCount: filteredCommits.length,
      activeRepoCount: repos.size,
      activeDayCount: days.size,
      additions: add,
      deletions: del,
      changedFiles: files.size
    }
  }, [filteredCommits])

  return (
    <div className="flex h-full flex-col overflow-hidden bg-[var(--ant-color-bg-layout)]">
      {/* 顶部工具栏 */}
      <div className="flex shrink-0 flex-col gap-3 border-b border-[var(--ant-color-border-secondary)] bg-[var(--ant-color-bg-container)] px-6 py-3.5">
        {/* 第一行：视图标题与主动作 */}
        <div className="flex min-h-[32px] items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <FileText size={18} className="text-[var(--ant-color-primary)] shrink-0" />
            <span className="text-base font-semibold text-[var(--ant-color-text)]">
              {t('nav.weeklyReport', { defaultValue: '全仓周报整理' })}
            </span>
            <Tooltip
              title={t('weeklyReport.activeRepoCountTooltip', {
                count: enabledRepos.length,
                defaultValue: `当前有 ${enabledRepos.length} 个工程参与周报`
              })}
            >
              <Tag color="blue" bordered={false} className="m-0 cursor-default font-mono text-xs">
                {enabledRepos.length} {t('stats.activeRepos', { defaultValue: '个工程' })}
              </Tag>
            </Tooltip>
          </div>

          <div className="flex items-center gap-2">
            <Tooltip title={t('filterBar.refresh', { defaultValue: '刷新数据' })}>
              <Button
                icon={<RefreshCw size={14} className={isFetching ? 'animate-spin' : ''} />}
                loading={isFetching}
                onClick={() => refetch()}
              >
                {t('filterBar.refresh', { defaultValue: '刷新' })}
              </Button>
            </Tooltip>
          </div>
        </div>

        {/* 第二行：时间筛选与全局搜索 */}
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Segmented
              value={timeRange.preset}
              options={timeRangeOptions}
              onChange={(val) => {
                const preset = val as TimeRangePreset
                if (preset === 'custom') {
                  const end = dayjs()
                  const start = end.startOf('day')
                  const bounds = customDayBounds(start.toDate(), end.toDate())
                  setTimeRange({
                    preset: 'custom',
                    customStart: bounds.start.toISOString(),
                    customEnd: bounds.end.toISOString()
                  })
                } else {
                  setTimeRange({ preset })
                }
              }}
            />

            {timeRange.preset === 'custom' && (
              <DatePicker.RangePicker
                value={customRangeValue}
                allowClear={false}
                onChange={(dates) => {
                  if (!dates?.[0] || !dates[1]) return
                  const bounds = customDayBounds(dates[0].toDate(), dates[1].toDate())
                  setTimeRange({
                    preset: 'custom',
                    customStart: bounds.start.toISOString(),
                    customEnd: bounds.end.toISOString()
                  })
                }}
              />
            )}
          </div>

          <div className="flex items-center gap-3">
            <ClosingMultiSelect
              allowClear
              maxTagCount="responsive"
              className="min-w-36 max-w-56"
              placeholder={t('filterBar.filterAuthors', { defaultValue: '全部作者' })}
              value={effectiveSelectedAuthors}
              options={authorOptions}
              onChange={setSelectedAuthors}
              loading={isLoading}
              notFoundContent={t('filterBar.noAuthors', { defaultValue: '当前范围暂无作者' })}
            />

            <Input
              placeholder={t('thisWeek.searchPlaceholder', { defaultValue: '搜索提交信息…' })}
              prefix={<Search size={14} className="text-[var(--ant-color-text-quaternary)]" />}
              value={searchKeyword}
              onChange={(e) => setSearchKeyword(e.target.value)}
              allowClear
              className="w-56"
            />
          </div>
        </div>
      </div>

      {/* 主体工作区 */}
      <div className="min-h-0 flex-1 overflow-auto p-4 md:p-6">
        {enabledRepos.length === 0 ? (
          <Empty
            className="mt-16"
            description={t('thisWeek.noEnabledRepos', {
              defaultValue: '暂无启用的本地工程。请前往「设置」添加本地 Git 仓库并勾选参与周报。'
            })}
          >
            {onNavigateToThisWeek && (
              <Button type="primary" onClick={onNavigateToThisWeek}>
                {t('welcome.backToOverview', { defaultValue: '返回项目概览' })}
              </Button>
            )}
          </Empty>
        ) : (
          <>
            {error && (
              <Alert
                type="error"
                showIcon
                className="mb-4"
                message={t('workbench.loadFailed', { defaultValue: '获取提交数据失败' })}
                description={error.message}
              />
            )}

            {isLoading ? (
              <div className="flex items-center justify-center p-12">
                <Spin tip={t('workbench.readingData', { defaultValue: '读取 Git 数据中…' })} />
              </div>
            ) : (
              <Tabs
                activeKey={activeTabKey}
                onChange={(key) => setActiveTabKey(key as 'report' | 'changes')}
                className="mt-1"
                items={[
                  {
                    key: 'report',
                    label: (
                      <span className="flex items-center gap-1.5 font-medium">
                        <FileText size={15} />
                        {t('thisWeek.tabReport', { defaultValue: '全仓周报' })}
                      </span>
                    ),
                    children: (
                      <Card
                        variant="outlined"
                        className="shadow-xs bg-[var(--ant-color-bg-container)] mt-2"
                        title={
                          <div className="flex flex-wrap items-center justify-between gap-3 py-1">
                            <Space size={8}>
                              <FileText size={16} className="text-[var(--ant-color-primary)]" />
                              <span className="font-semibold text-sm">
                                {t('weeklyReport.fullReportTitle', {
                                  defaultValue: '全仓工作周报'
                                })}
                              </span>
                            </Space>

                            <Button
                              type="primary"
                              icon={<Copy size={14} />}
                              disabled={filteredCommits.length === 0}
                              onClick={() => void handleCopyMarkdown()}
                            >
                              {t('weeklyReport.copyWeeklyReport', {
                                defaultValue: '复制周报 Markdown'
                              })}
                            </Button>
                          </div>
                        }
                      >
                        <div className="min-h-[360px] rounded border border-[var(--ant-color-border-secondary)] bg-[var(--ant-color-bg-container)]">
                          <MarkdownReportPreview
                            markdown={markdownText}
                            commits={filteredCommits}
                            emptyDescription={t('weeklyReport.emptyMarkdown', {
                              defaultValue: '暂无周报内容'
                            })}
                          />
                        </div>
                      </Card>
                    )
                  },
                  {
                    key: 'changes',
                    label: (
                      <span className="flex items-center gap-1.5 font-medium">
                        <GitCommit size={15} />
                        {t('thisWeek.tabChanges', { defaultValue: '相关修改' })}
                        <Tooltip
                          title={t('weeklyReport.commitCountTooltip', {
                            count: filteredCommits.length,
                            defaultValue: `当前筛选范围内共 ${filteredCommits.length} 次提交`
                          })}
                        >
                          <Tag className="ml-1 cursor-default text-xs font-mono" bordered={false}>
                            {filteredCommits.length}
                          </Tag>
                        </Tooltip>
                      </span>
                    ),
                    children: (
                      <div className="flex flex-col gap-3 mt-2">
                        <StatsHeader stats={filteredStats} showRepoCount={true} />
                        <WeeklyChangesFeed commits={filteredCommits} />
                      </div>
                    )
                  }
                ]}
              />
            )}
          </>
        )}
      </div>
    </div>
  )
}
