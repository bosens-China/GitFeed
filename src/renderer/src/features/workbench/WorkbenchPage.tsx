import { useQueryClient } from '@tanstack/react-query'
import { Alert, App, Drawer, Empty, Spin } from 'antd'
import { useEffect, useState } from 'react'
import { buildCommitsMarkdown } from '@shared/markdown'
import type { RepositoryFilters, RepositoryQuerySuccess } from '@shared/models'
import { ThemeSettings } from '@renderer/components/ThemeSettings'
import { useRepositoryQuery, useWorkbench } from '@renderer/hooks/useWorkbench'
import { CommitList } from './CommitList'
import { FilterBar } from './FilterBar'
import { RepositorySidebar } from './RepositorySidebar'
import { StatsBar } from './StatsBar'

export function WorkbenchPage(): React.JSX.Element {
  const { message } = App.useApp()
  const queryClient = useQueryClient()
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [copying, setCopying] = useState(false)

  const {
    state,
    isLoading,
    addRepository,
    removeRepository,
    setActiveRepository,
    updateFilters,
    adding,
    updatingFilters
  } = useWorkbench()

  const activeId = state?.activeRepositoryId ?? null
  const activeRepo = state?.repositories.find((repo) => repo.id === activeId) ?? null

  const { data: queryResult, isFetching, refetch, errorMessage } = useRepositoryQuery(activeId)

  useEffect(() => {
    if (queryResult?.ok) {
      void queryClient.invalidateQueries({ queryKey: ['workbench'] })
    }
  }, [queryResult, queryClient])

  const success: RepositoryQuerySuccess | null = queryResult && queryResult.ok ? queryResult : null
  const busy = isFetching || updatingFilters

  const onFiltersChange = async (filters: RepositoryFilters): Promise<void> => {
    if (!activeId) return
    try {
      await updateFilters(activeId, filters)
      await queryClient.invalidateQueries({ queryKey: ['repository', activeId] })
    } catch {
      // mutation already reports the error
    }
  }

  const onCopy = async (): Promise<void> => {
    if (
      busy ||
      !success ||
      !activeRepo ||
      success.commits.length === 0 ||
      !success.resolvedBranch
    ) {
      return
    }
    setCopying(true)
    try {
      const markdown = buildCommitsMarkdown({
        repoName: success.name,
        repoPath: success.path,
        branch: success.resolvedBranch,
        timeRange: success.timeRange,
        authorsFilter: success.authorsFilter,
        allAuthors: success.authors,
        includeMerge: success.includeMerge,
        stats: success.stats,
        commits: success.commits
      })
      await navigator.clipboard.writeText(markdown)
      message.success('已复制 Markdown')
    } catch {
      message.error('复制失败')
    } finally {
      setCopying(false)
    }
  }

  if (isLoading || !state) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Spin size="large" tip="加载工作台…" />
      </div>
    )
  }

  return (
    <div className="flex h-screen overflow-hidden bg-[var(--ant-color-bg-layout)] text-[var(--ant-color-text)]">
      <RepositorySidebar
        repositories={state.repositories}
        activeId={activeId}
        adding={adding}
        onAdd={addRepository}
        onSelect={setActiveRepository}
        onRemove={removeRepository}
        onOpenSettings={() => setSettingsOpen(true)}
      />

      <main className="flex min-w-0 flex-1 flex-col pt-[env(titlebar-area-height,0px)]">
        {!activeRepo ? (
          <div className="flex flex-1 items-center justify-center">
            <Empty description="添加一个本地 Git 仓库开始审查" />
          </div>
        ) : (
          <>
            <FilterBar
              filters={activeRepo.filters}
              query={success}
              copying={copying}
              refreshing={busy}
              canCopy={Boolean(!busy && success && success.commits.length > 0)}
              onChange={(filters) => {
                void onFiltersChange(filters)
              }}
              onRefresh={refetch}
              onCopy={() => {
                void onCopy()
              }}
            />

            {success?.branchWarning ? (
              <Alert
                className="mx-4 mt-3"
                type="warning"
                showIcon
                closable
                message={success.branchWarning}
              />
            ) : null}

            {errorMessage ? (
              <Alert className="mx-4 mt-3" type="error" showIcon message={errorMessage} />
            ) : null}

            {isFetching ? (
              <div className="flex flex-1 items-center justify-center">
                <Spin tip="读取 Git 数据…" />
              </div>
            ) : success ? (
              <>
                <StatsBar stats={success.stats} />
                <CommitList
                  commits={success.commits}
                  branch={success.resolvedBranch}
                  emptyReason={
                    !success.resolvedBranch
                      ? 'no-branch'
                      : success.authorsFilter.mode === 'selected' &&
                          success.authorsFilter.authors.length === 0
                        ? 'no-authors'
                        : 'no-results'
                  }
                />
              </>
            ) : (
              <div className="flex flex-1 items-center justify-center">
                <Empty description="无法加载仓库数据" />
              </div>
            )}
          </>
        )}
      </main>

      <Drawer title="设置" open={settingsOpen} onClose={() => setSettingsOpen(false)} width={400}>
        <ThemeSettings />
      </Drawer>
    </div>
  )
}
