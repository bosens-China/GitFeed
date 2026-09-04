import { useMemo, useState } from 'react'
import { Alert, Button, Empty, Spin, Tabs, Tag } from 'antd'
import { FileText, GitCommit } from 'lucide-react'
import dayjs from 'dayjs'
import isoWeek from 'dayjs/plugin/isoWeek'
import { useTranslation } from 'react-i18next'
import type { CommitItem, TimeRangeState } from '@shared/models'
import { localDateKey } from '@shared/time-range'
import { useWeeklyActivity, useWorkbench } from '@renderer/hooks/useWorkbench'
import { AggregatedCommitFeed } from './AggregatedCommitFeed'
import { ProjectReportTab } from './ProjectReportTab'
import { StatsHeader } from './StatsHeader'
import { ThisWeekFilterBar } from './ThisWeekFilterBar'

dayjs.extend(isoWeek)

interface ThisWeekPageProps {
  selectedRepoId?: string | null
  onNavigateToSettings?: () => void
  onBackToOverview?: () => void
}

export function ThisWeekPage({
  selectedRepoId,
  onNavigateToSettings,
  onBackToOverview
}: ThisWeekPageProps = {}): React.JSX.Element {
  const { t } = useTranslation()
  const { state: workbench } = useWorkbench()

  const [timeRange, setTimeRange] = useState<TimeRangeState>({ preset: 'thisWeek' })
  const [selectedRepoIds, setSelectedRepoIds] = useState<string[]>(() =>
    selectedRepoId ? [selectedRepoId] : []
  )
  const [selectedAuthors, setSelectedAuthors] = useState<string[]>([])
  const [searchKeyword, setSearchKeyword] = useState<string>('')
  const [activeTabKey, setActiveTabKey] = useState<'report' | 'changes'>('report')
  const [analysisBranch, setAnalysisBranch] = useState<string | null>(null)

  const currentRepo = useMemo(
    () =>
      selectedRepoIds.length === 1
        ? workbench?.repositories.find((repo) => repo.id === selectedRepoIds[0])
        : undefined,
    [selectedRepoIds, workbench?.repositories]
  )

  const {
    data: activityData,
    isFetching,
    isLoading,
    refetch,
    error
  } = useWeeklyActivity(
    timeRange,
    undefined,
    currentRepo && analysisBranch ? { repoId: currentRepo.id, branch: analysisBranch } : undefined
  )

  const authorOptions = useMemo(() => {
    const allCommits = activityData?.allCommits ?? []
    const authorSet = new Set<string>()
    for (const c of allCommits) {
      if (selectedRepoIds.length > 0 && (!c.repoId || !selectedRepoIds.includes(c.repoId))) {
        continue
      }
      if (c.authorName) {
        authorSet.add(c.authorName)
      }
    }
    return Array.from(authorSet)
      .sort()
      .map((name) => ({ label: name, value: name }))
  }, [activityData?.allCommits, selectedRepoIds])

  const filteredCommits = useMemo((): CommitItem[] => {
    const allCommits = activityData?.allCommits ?? []
    return allCommits.filter((c) => {
      if (selectedRepoIds.length > 0 && (!c.repoId || !selectedRepoIds.includes(c.repoId))) {
        return false
      }
      if (selectedAuthors.length > 0 && !selectedAuthors.includes(c.authorName)) {
        return false
      }
      if (!searchKeyword.trim()) return true
      const kw = searchKeyword.toLowerCase()
      return c.message.toLowerCase().includes(kw) || c.shortHash.toLowerCase().includes(kw)
    })
  }, [activityData?.allCommits, selectedRepoIds, selectedAuthors, searchKeyword])

  const enabledRepos = useMemo(
    () => (workbench?.repositories ?? []).filter((r) => r.enabledForReport),
    [workbench?.repositories]
  )

  const currentRepoName = useMemo(() => {
    if (selectedRepoIds.length === 1) {
      return workbench?.repositories.find((r) => r.id === selectedRepoIds[0])?.name ?? '当前工程'
    }
    return t('thisWeek.allRepos', { defaultValue: '全部参与工程' })
  }, [selectedRepoIds, workbench?.repositories, t])

  // 单工程或当前筛选集统计
  const currentStats = useMemo(() => {
    if (selectedRepoIds.length === 1) {
      let add = 0
      let del = 0
      const files = new Set<string>()
      const days = new Set<string>()

      for (const c of filteredCommits) {
        days.add(localDateKey(c.authoredAt))
        for (const f of c.files) {
          files.add(f.path)
          if (f.additions) add += f.additions
          if (f.deletions) del += f.deletions
        }
      }

      return {
        commitCount: filteredCommits.length,
        activeRepoCount: 1,
        activeDayCount: days.size,
        additions: add,
        deletions: del,
        changedFiles: files.size
      }
    }

    return (
      activityData?.summaryStats ?? {
        commitCount: 0,
        activeRepoCount: 0,
        activeDayCount: 0,
        additions: 0,
        deletions: 0,
        changedFiles: 0
      }
    )
  }, [selectedRepoIds, filteredCommits, activityData?.summaryStats])

  return (
    <div className="flex h-full flex-col overflow-hidden bg-[var(--ant-color-bg-layout)]">
      <ThisWeekFilterBar
        timeRange={timeRange}
        onTimeRangeChange={setTimeRange}
        repositories={workbench?.repositories ?? []}
        selectedRepoIds={selectedRepoIds}
        onSelectedRepoIdsChange={setSelectedRepoIds}
        searchKeyword={searchKeyword}
        onSearchKeywordChange={setSearchKeyword}
        authorOptions={authorOptions}
        selectedAuthors={selectedAuthors}
        onSelectedAuthorsChange={setSelectedAuthors}
        analysisBranch={analysisBranch}
        onAnalysisBranchChange={setAnalysisBranch}
        isRefreshing={isFetching}
        onRefresh={() => refetch()}
        onBackToOverview={onBackToOverview}
      />

      <div className="min-h-0 flex-1 overflow-auto p-4 md:p-6">
        {enabledRepos.length === 0 ? (
          <Empty
            className="mt-16"
            description={t('thisWeek.noEnabledRepos', {
              defaultValue: '暂无启用的本地工程。请前往「设置」添加本地 Git 仓库并勾选参与周报。'
            })}
          >
            {onNavigateToSettings && (
              <Button type="primary" onClick={onNavigateToSettings}>
                {t('thisWeek.goToSettings', { defaultValue: '前往设置' })}
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
                        {t('thisWeek.tabReport', { defaultValue: '周报' })}
                      </span>
                    ),
                    children: (
                      <ProjectReportTab
                        repoName={currentRepoName}
                        timeRangeLabel={activityData?.timeRange.label}
                        commits={filteredCommits}
                      />
                    )
                  },
                  {
                    key: 'changes',
                    label: (
                      <span className="flex items-center gap-1.5 font-medium">
                        <GitCommit size={15} />
                        {t('thisWeek.tabChanges', { defaultValue: '相关修改' })}
                        <Tag className="ml-1 text-xs font-mono" bordered={false}>
                          {filteredCommits.length}
                        </Tag>
                      </span>
                    ),
                    children: (
                      <div className="flex flex-col gap-3 mt-2">
                        <StatsHeader
                          stats={currentStats}
                          showRepoCount={selectedRepoIds.length !== 1}
                        />
                        <AggregatedCommitFeed commits={filteredCommits} />
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
