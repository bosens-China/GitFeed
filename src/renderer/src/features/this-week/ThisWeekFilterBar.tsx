import { Button, DatePicker, Input, Segmented, Select, Space, Tag, Tooltip } from 'antd'
import { FolderGit2, GitBranch, RefreshCw, Search } from 'lucide-react'
import dayjs, { type Dayjs } from 'dayjs'
import { useTranslation } from 'react-i18next'
import type { RepositoryRecord, TimeRangePreset, TimeRangeState } from '@shared/models'
import { customDayBounds } from '@shared/time-range'
import { ClosingMultiSelect } from '@renderer/components/ClosingMultiSelect'

const CONFIGURED_BRANCHES_VALUE = '\u0000configured-branches'

interface ThisWeekFilterBarProps {
  timeRange: TimeRangeState
  onTimeRangeChange: (next: TimeRangeState) => void
  repositories: RepositoryRecord[]
  selectedRepoIds: string[]
  onSelectedRepoIdsChange: (ids: string[]) => void
  searchKeyword: string
  onSearchKeywordChange: (kw: string) => void
  authorOptions: { label: string; value: string }[]
  selectedAuthors: string[]
  onSelectedAuthorsChange: (authors: string[]) => void
  analysisBranch?: string | null
  onAnalysisBranchChange?: (branch: string | null) => void
  isRefreshing?: boolean
  onRefresh: () => void
}

export function ThisWeekFilterBar({
  timeRange,
  onTimeRangeChange,
  repositories,
  selectedRepoIds,
  onSelectedRepoIdsChange,
  searchKeyword,
  onSearchKeywordChange,
  authorOptions,
  selectedAuthors,
  onSelectedAuthorsChange,
  analysisBranch,
  onAnalysisBranchChange,
  isRefreshing,
  onRefresh
}: ThisWeekFilterBarProps): React.JSX.Element {
  const { t } = useTranslation()

  const currentRepo =
    selectedRepoIds.length === 1 ? repositories.find((r) => r.id === selectedRepoIds[0]) : null

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

  const repoOptions = repositories
    .filter((r) => r.enabledForReport)
    .map((r) => ({
      label: r.name,
      value: r.id
    }))

  const configuredBranches = currentRepo?.selectedBranches ?? []
  const availableBranches = currentRepo?.availableBranches ?? []
  const allBranches = Array.from(
    new Set([
      ...configuredBranches,
      ...availableBranches,
      ...(currentRepo?.filters.branch ? [currentRepo.filters.branch] : [])
    ])
  )
  const otherBranches = allBranches.filter((b) => !configuredBranches.includes(b))

  // 构建分支下拉选项（分组展示，清晰呈现已追踪分支与其它分支）
  const branchSelectOptions = [
    ...(configuredBranches.length <= 1
      ? [
          {
            label: (
              <div className="flex items-center justify-between gap-2 py-0.5">
                <span className="flex items-center gap-1.5 font-mono text-xs">
                  <GitBranch size={13} className="text-[var(--ant-color-primary)] shrink-0" />
                  <span className="font-medium">
                    {configuredBranches[0] ??
                      t('filterBar.defaultBranch', { defaultValue: '默认分支' })}
                  </span>
                </span>
                <Tag
                  color="blue"
                  bordered={false}
                  className="m-0 text-[10px] px-1.5 py-0 leading-4"
                >
                  {t('filterBar.trackedTag', { defaultValue: '追踪' })}
                </Tag>
              </div>
            ),
            value: CONFIGURED_BRANCHES_VALUE
          }
        ]
      : [
          {
            label: (
              <div className="flex items-center justify-between gap-2 py-0.5">
                <span className="flex items-center gap-1.5 font-medium text-xs">
                  <GitBranch size={13} className="text-[var(--ant-color-primary)] shrink-0" />
                  <span>{t('filterBar.allTrackedBranches', { defaultValue: '全部追踪分支' })}</span>
                </span>
                <Tag
                  color="blue"
                  bordered={false}
                  className="m-0 font-mono text-[10px] px-1.5 py-0 leading-4"
                >
                  {configuredBranches.length}
                </Tag>
              </div>
            ),
            value: CONFIGURED_BRANCHES_VALUE
          },
          {
            label: t('filterBar.groupConfigured', { defaultValue: '已配置分析分支' }),
            title: 'configured-group',
            options: configuredBranches.map((b) => ({
              label: (
                <div className="flex items-center justify-between gap-2 py-0.5">
                  <span className="flex items-center gap-1.5 font-mono text-xs">
                    <GitBranch size={13} className="text-gray-400 shrink-0" />
                    <span>{b}</span>
                  </span>
                  <Tag
                    color="blue"
                    bordered={false}
                    className="m-0 text-[10px] px-1.5 py-0 leading-4"
                  >
                    {t('filterBar.trackedTag', { defaultValue: '追踪' })}
                  </Tag>
                </div>
              ),
              value: b
            }))
          }
        ]),
    ...(otherBranches.length > 0
      ? [
          {
            label: t('filterBar.groupOtherBranches', { defaultValue: '其他本地分支' }),
            title: 'other-branches-group',
            options: otherBranches.map((b) => ({
              label: (
                <div className="flex items-center gap-1.5 py-0.5 font-mono text-xs">
                  <GitBranch size={13} className="text-gray-400 shrink-0" />
                  <span>{b}</span>
                </div>
              ),
              value: b
            }))
          }
        ]
      : [])
  ]

  const renderBranchLabel = (props: {
    label: React.ReactNode
    value: unknown
  }): React.ReactNode => {
    if (props.value === CONFIGURED_BRANCHES_VALUE) {
      if (configuredBranches.length === 1) {
        return (
          <span className="flex items-center gap-1.5 min-w-0">
            <span className="truncate font-mono text-xs font-medium">{configuredBranches[0]}</span>
            <Tag
              color="blue"
              bordered={false}
              className="m-0 text-[10px] px-1.5 py-0 leading-4 shrink-0"
            >
              {t('filterBar.trackedTag', { defaultValue: '追踪' })}
            </Tag>
          </span>
        )
      }
      if (configuredBranches.length > 1) {
        return (
          <span className="flex items-center gap-1.5 min-w-0">
            <span className="truncate text-xs font-medium">
              {t('filterBar.allTrackedBranches', { defaultValue: '全部追踪分支' })}
            </span>
            <Tag
              color="blue"
              bordered={false}
              className="m-0 font-mono text-[10px] px-1 py-0 leading-4 shrink-0"
            >
              {configuredBranches.length}
            </Tag>
          </span>
        )
      }
      return (
        <span className="text-xs">
          {t('filterBar.defaultBranch', { defaultValue: '默认分支' })}
        </span>
      )
    }

    const branchName = String(props.value)
    const isConfigured = configuredBranches.includes(branchName)

    return (
      <span className="flex items-center gap-1.5 min-w-0">
        <span className="truncate font-mono text-xs font-medium">{branchName}</span>
        {isConfigured ? (
          <Tag
            color="blue"
            bordered={false}
            className="m-0 text-[10px] px-1.5 py-0 leading-4 shrink-0"
          >
            {t('filterBar.trackedTag', { defaultValue: '追踪' })}
          </Tag>
        ) : (
          <Tag
            color="orange"
            bordered={false}
            className="m-0 text-[10px] px-1.5 py-0 leading-4 shrink-0"
          >
            {t('filterBar.temporaryTag', { defaultValue: '临时' })}
          </Tag>
        )}
      </span>
    )
  }

  return (
    <div className="flex shrink-0 flex-col gap-3 border-b border-[var(--ant-color-border-secondary)] bg-[var(--ant-color-bg-container)] px-6 py-3.5">
      {/* 第一行：工程上下文与核心操作区 */}
      <div className="flex min-h-[32px] items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          {currentRepo ? (
            <div className="flex items-center gap-3 min-w-0">
              <div className="flex items-center gap-2 min-w-0">
                <FolderGit2 size={18} className="text-[var(--ant-color-primary)] shrink-0" />
                <span
                  className="font-semibold text-base text-[var(--ant-color-text)] truncate max-w-xs"
                  title={currentRepo.name}
                >
                  {currentRepo.name}
                </span>
              </div>

              {onAnalysisBranchChange ? (
                <>
                  <span className="h-4 w-px bg-[var(--ant-color-border-secondary)] shrink-0" />
                  <Tooltip
                    title={t('filterBar.analysisBranchHint', {
                      defaultValue:
                        '仅切换当前页面的分析范围，不会执行 Git checkout 或修改本地仓库。'
                    })}
                  >
                    <Select
                      aria-label={t('filterBar.analysisBranch', { defaultValue: '查看分支' })}
                      className="min-w-[150px] max-w-[260px]"
                      value={analysisBranch ?? CONFIGURED_BRANCHES_VALUE}
                      prefix={
                        <GitBranch
                          size={13}
                          className="text-[var(--ant-color-primary)] opacity-80 shrink-0"
                        />
                      }
                      options={branchSelectOptions}
                      labelRender={renderBranchLabel}
                      onChange={(branch) =>
                        onAnalysisBranchChange(branch === CONFIGURED_BRANCHES_VALUE ? null : branch)
                      }
                    />
                  </Tooltip>
                </>
              ) : null}
            </div>
          ) : (
            <div className="flex items-center gap-2.5">
              <FolderGit2 size={18} className="text-[var(--ant-color-primary)] shrink-0" />
              <span className="text-base font-semibold text-[var(--ant-color-text)]">
                {t('thisWeek.allRepos', { defaultValue: '全部参与工程' })}
              </span>
            </div>
          )}
        </div>

        {/* 右侧核心动作 */}
        <div className="flex items-center gap-2">
          <Tooltip title={t('filterBar.refresh', { defaultValue: '刷新数据' })}>
            <Button
              icon={<RefreshCw size={14} className={isRefreshing ? 'animate-spin' : ''} />}
              loading={isRefreshing}
              onClick={onRefresh}
            >
              {t('filterBar.refresh', { defaultValue: '刷新' })}
            </Button>
          </Tooltip>
        </div>
      </div>

      {/* 第二行：时间范围筛选、作者下拉与提交信息搜索 */}
      <div className="flex items-center justify-between gap-4">
        <Space size="middle" className="flex-1">
          <Segmented
            value={timeRange.preset}
            options={timeRangeOptions}
            onChange={(val) => {
              const preset = val as TimeRangePreset
              if (preset === 'custom') {
                const end = dayjs()
                const start = end.startOf('day')
                const bounds = customDayBounds(start.toDate(), end.toDate())
                onTimeRangeChange({
                  preset: 'custom',
                  customStart: bounds.start.toISOString(),
                  customEnd: bounds.end.toISOString()
                })
              } else {
                onTimeRangeChange({ preset })
              }
            }}
          />

          {timeRange.preset === 'custom' ? (
            <DatePicker.RangePicker
              value={customRangeValue}
              allowClear={false}
              onChange={(dates) => {
                if (!dates?.[0] || !dates[1]) return
                const bounds = customDayBounds(dates[0].toDate(), dates[1].toDate())
                onTimeRangeChange({
                  preset: 'custom',
                  customStart: bounds.start.toISOString(),
                  customEnd: bounds.end.toISOString()
                })
              }}
            />
          ) : null}

          {!currentRepo && repoOptions.length > 0 ? (
            <ClosingMultiSelect
              allowClear
              maxTagCount="responsive"
              className="min-w-48 max-w-72"
              placeholder={t('thisWeek.allRepos', { defaultValue: '全部参与工程' })}
              value={selectedRepoIds}
              options={repoOptions}
              onChange={onSelectedRepoIdsChange}
            />
          ) : null}
        </Space>

        <Space size="middle">
          <ClosingMultiSelect
            allowClear
            maxTagCount="responsive"
            className="min-w-36 max-w-56"
            placeholder={t('filterBar.filterAuthors', { defaultValue: '全部作者' })}
            value={selectedAuthors}
            options={authorOptions}
            onChange={onSelectedAuthorsChange}
            loading={isRefreshing}
            notFoundContent={t('filterBar.noAuthors', { defaultValue: '当前范围暂无作者' })}
          />

          <Input
            placeholder={t('thisWeek.searchPlaceholder', { defaultValue: '搜索提交信息…' })}
            prefix={<Search size={14} className="text-[var(--ant-color-text-quaternary)]" />}
            value={searchKeyword}
            onChange={(e) => onSearchKeywordChange(e.target.value)}
            allowClear
            className="w-56"
          />
        </Space>
      </div>
    </div>
  )
}
