import { Button, DatePicker, Input, Segmented, Select, Space, Tooltip } from 'antd'
import { ArrowLeft, FolderGit2, GitBranch, RefreshCw, Search } from 'lucide-react'
import dayjs, { type Dayjs } from 'dayjs'
import { useTranslation } from 'react-i18next'
import type { RepositoryRecord, TimeRangePreset, TimeRangeState } from '@shared/models'
import { customDayBounds } from '@shared/time-range'

const CONFIGURED_BRANCHES_VALUE = '\u0000configured-branches'

interface ThisWeekFilterBarProps {
  timeRange: TimeRangeState
  onTimeRangeChange: (next: TimeRangeState) => void
  repositories: RepositoryRecord[]
  selectedRepoIds: string[]
  onSelectedRepoIdsChange: (ids: string[]) => void
  searchKeyword: string
  onSearchKeywordChange: (kw: string) => void
  authorOptions?: { label: string; value: string }[]
  selectedAuthors?: string[]
  onSelectedAuthorsChange?: (authors: string[]) => void
  analysisBranch?: string | null
  onAnalysisBranchChange?: (branch: string | null) => void
  isRefreshing?: boolean
  onRefresh: () => void
  onBackToOverview?: () => void
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
  onRefresh,
  onBackToOverview
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

  const defaultBranchDisplayLabel = configuredBranches.length > 0
    ? configuredBranches.length === 1
      ? `${t('filterBar.defaultBranchPrefix', { defaultValue: '追踪分支' })}: ${configuredBranches[0]}`
      : `${t('filterBar.allTrackedBranches', { defaultValue: '全部追踪分支' })} (${configuredBranches.length})`
    : t('filterBar.defaultBranch', { defaultValue: '默认分支' })

  // 构建分支下拉选项（分组）
  const branchSelectOptions = [
    {
      label: defaultBranchDisplayLabel,
      value: CONFIGURED_BRANCHES_VALUE
    },
    ...(configuredBranches.length > 1
      ? [
          {
            label: t('filterBar.groupConfigured', { defaultValue: '已配置分析分支' }),
            title: 'configured-group',
            options: configuredBranches.map((b) => ({
              label: (
                <Space size={6}>
                  <GitBranch size={12} className="opacity-60" />
                  <span>{b}</span>
                </Space>
              ),
              value: b
            }))
          }
        ]
      : []),
    {
      label: t('filterBar.groupAllBranches', { defaultValue: '所有本地分支' }),
      title: 'all-branches-group',
      options: allBranches.map((b) => ({
        label: (
          <Space size={6}>
            <GitBranch size={12} className="opacity-60" />
            <span>{b}</span>
          </Space>
        ),
        value: b
      }))
    }
  ]

  return (
    <div className="flex flex-col gap-3 border-b border-[var(--ant-color-border-secondary)] bg-[var(--ant-color-bg-container)] px-6 py-3.5 shrink-0">
      {/* 第一行：工程上下文与核心操作区 */}
      <div className="flex items-center justify-between gap-4">
        <Space size="middle" className="min-w-0">
          {onBackToOverview && (
            <Button
              type="text"
              icon={<ArrowLeft size={16} />}
              onClick={onBackToOverview}
            >
              <span>{t('common.back', { defaultValue: '返回项目概览' })}</span>
            </Button>
          )}

          {currentRepo ? (
            <Space size="middle" className="min-w-0">
              <Space size={6} className="min-w-0">
                <FolderGit2 size={18} className="text-[var(--ant-color-primary)] shrink-0" />
                <span className="font-semibold text-base truncate max-w-xs" title={currentRepo.name}>
                  {currentRepo.name}
                </span>
              </Space>

              {onAnalysisBranchChange ? (
                <Tooltip
                  title={t('filterBar.analysisBranchHint', {
                    defaultValue: '仅切换当前页面的分析范围，不会执行 Git checkout 或修改本地仓库。'
                  })}
                >
                  <Select
                    aria-label={t('filterBar.analysisBranch', { defaultValue: '查看分支' })}
                    style={{ width: 220 }}
                    value={analysisBranch ?? CONFIGURED_BRANCHES_VALUE}
                    prefix={<GitBranch size={14} className="opacity-60" />}
                    options={branchSelectOptions}
                    onChange={(branch) =>
                      onAnalysisBranchChange(branch === CONFIGURED_BRANCHES_VALUE ? null : branch)
                    }
                  />
                </Tooltip>
              ) : null}
            </Space>
          ) : (
            <span className="text-base font-semibold">
              {t('thisWeek.allRepos', { defaultValue: '全部参与工程' })}
            </span>
          )}
        </Space>

        {/* 右侧核心动作 */}
        <Space size="small">
          <Tooltip title={t('filterBar.refresh', { defaultValue: '刷新数据' })}>
            <Button
              icon={<RefreshCw size={14} className={isRefreshing ? 'animate-spin' : ''} />}
              loading={isRefreshing}
              onClick={onRefresh}
            >
              {t('filterBar.refresh', { defaultValue: '刷新' })}
            </Button>
          </Tooltip>
        </Space>
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
            <Select
              mode="multiple"
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
          {authorOptions && authorOptions.length > 0 && onSelectedAuthorsChange ? (
            <Select
              mode="multiple"
              allowClear
              maxTagCount="responsive"
              className="min-w-36 max-w-56"
              placeholder={t('filterBar.filterAuthors', { defaultValue: '全部作者' })}
              value={selectedAuthors}
              options={authorOptions}
              onChange={onSelectedAuthorsChange}
            />
          ) : null}

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
