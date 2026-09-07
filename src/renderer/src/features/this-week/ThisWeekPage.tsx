import { useEffect, useMemo, useRef, useState } from 'react'
import { Alert, Spin, Tabs, Tag } from 'antd'
import { FileText, GitCommit } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import {
  authorKey,
  defaultSelectedAuthorKeys,
  type CommitItem,
  type ProjectViewTab,
  type TimeRangeState
} from '@shared/models'
import { collectAuthors, computeStats } from '@shared/commit-utils'
import { useWeeklyActivity, useWorkbench } from '@renderer/hooks/useWorkbench'
import { AggregatedCommitFeed } from './AggregatedCommitFeed'
import { RepositoryQueryErrors } from './RepositoryQueryErrors'
import { ProjectReportTab } from './ProjectReportTab'
import { StatsHeader } from './StatsHeader'
import { ThisWeekFilterBar } from './ThisWeekFilterBar'

interface ThisWeekPageProps {
  selectedRepoId: string
}

export function ThisWeekPage({ selectedRepoId }: ThisWeekPageProps): React.JSX.Element {
  const { t } = useTranslation()
  const { state: workbench, saveProjectView } = useWorkbench()

  const [timeRange, setTimeRange] = useState<TimeRangeState>({ preset: 'thisWeek' })
  const [selectedAuthors, setSelectedAuthors] = useState<string[] | null>(null)
  const [searchKeyword, setSearchKeyword] = useState<string>('')
  const [activeTabKey, setActiveTabKey] = useState<ProjectViewTab>('report')
  const [analysisBranch, setAnalysisBranch] = useState<string | null>(null)
  const [memoryReady, setMemoryReady] = useState(false)
  const restoredRepoId = useRef<string | null>(null)
  const saveProjectViewRef = useRef(saveProjectView)

  useEffect(() => {
    saveProjectViewRef.current = saveProjectView
  }, [saveProjectView])

  const currentRepo = workbench?.repositories.find((repo) => repo.id === selectedRepoId)
  const currentRepoId = currentRepo?.id

  useEffect(() => {
    if (!currentRepo || restoredRepoId.current === currentRepo.id) return

    const memory = currentRepo.viewMemory
    const knownBranches = new Set([
      ...(currentRepo.selectedBranches ?? []),
      ...(currentRepo.availableBranches ?? [])
    ])
    setTimeRange(memory?.timeRange ?? { preset: 'thisWeek' })
    setSelectedAuthors(memory?.selectedAuthorKeys ?? null)
    setSearchKeyword(memory?.searchKeyword ?? '')
    setActiveTabKey(memory?.activeTabKey ?? 'report')
    setAnalysisBranch(
      memory?.analysisBranch && knownBranches.has(memory.analysisBranch)
        ? memory.analysisBranch
        : null
    )
    restoredRepoId.current = currentRepo.id
    setMemoryReady(true)
  }, [currentRepo, selectedRepoId, workbench?.myIdentities.length])

  const {
    data: activityData,
    isFetching,
    isLoading,
    refetch,
    error
  } = useWeeklyActivity(
    timeRange,
    undefined,
    currentRepo && analysisBranch ? { repoId: currentRepo.id, branch: analysisBranch } : undefined,
    selectedRepoId
  )

  const availableAuthors = useMemo(
    () => collectAuthors(activityData?.allCommits ?? []).filter((author) => author.name),
    [activityData?.allCommits]
  )

  const authorOptions = useMemo(() => {
    const options = availableAuthors.map((author) => ({
      label: author.email ? `${author.name} <${author.email}>` : author.name,
      value: authorKey(author)
    }))
    const knownKeys = new Set(options.map((option) => option.value))
    for (const key of selectedAuthors ?? []) {
      if (knownKeys.has(key)) continue
      const [name, email = ''] = key.split('\u0000')
      options.push({ label: email ? `${name} <${email}>` : name, value: key })
    }
    return options
  }, [availableAuthors, selectedAuthors])

  const effectiveSelectedAuthors = useMemo(
    () =>
      selectedAuthors ?? defaultSelectedAuthorKeys(availableAuthors, workbench?.myIdentities ?? []),
    [availableAuthors, selectedAuthors, workbench?.myIdentities]
  )

  useEffect(() => {
    if (!currentRepoId || !memoryReady || (selectedAuthors === null && !activityData)) {
      return
    }
    const timer = window.setTimeout(() => {
      if (selectedAuthors === null) setSelectedAuthors(effectiveSelectedAuthors)
      void saveProjectViewRef.current(currentRepoId, {
        timeRange,
        selectedAuthorKeys: effectiveSelectedAuthors,
        searchKeyword,
        activeTabKey,
        analysisBranch
      })
    }, 250)
    return () => window.clearTimeout(timer)
  }, [
    activeTabKey,
    analysisBranch,
    currentRepoId,
    activityData,
    effectiveSelectedAuthors,
    memoryReady,
    searchKeyword,
    selectedAuthors,
    selectedRepoId,
    timeRange
  ])

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
      return c.message.toLowerCase().includes(kw) || c.shortHash.toLowerCase().includes(kw)
    })
  }, [activityData?.allCommits, effectiveSelectedAuthors, searchKeyword])

  const currentRepoName = currentRepo?.name ?? '当前工程'
  const currentStats = useMemo(() => computeStats(filteredCommits), [filteredCommits])

  return (
    <div className="flex h-full flex-col overflow-hidden bg-[var(--ant-color-bg-layout)]">
      <ThisWeekFilterBar
        timeRange={timeRange}
        onTimeRangeChange={setTimeRange}
        currentRepo={currentRepo}
        searchKeyword={searchKeyword}
        onSearchKeywordChange={setSearchKeyword}
        authorOptions={authorOptions}
        selectedAuthors={effectiveSelectedAuthors}
        onSelectedAuthorsChange={setSelectedAuthors}
        analysisBranch={analysisBranch}
        onAnalysisBranchChange={setAnalysisBranch}
        isRefreshing={isFetching}
        onRefresh={() => refetch()}
      />

      <div className="min-h-0 flex-1 overflow-auto p-4 md:p-6">
        <RepositoryQueryErrors repos={activityData?.repos} />
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
            onChange={(key) => setActiveTabKey(key as ProjectViewTab)}
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
                    <StatsHeader stats={currentStats} showRepoCount={false} />
                    <AggregatedCommitFeed commits={filteredCommits} />
                  </div>
                )
              }
            ]}
          />
        )}
      </div>
    </div>
  )
}
