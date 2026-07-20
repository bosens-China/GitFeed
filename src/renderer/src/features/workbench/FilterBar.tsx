import { CopyOutlined, ReloadOutlined } from '@ant-design/icons'
import { Button, DatePicker, Select, Space, Switch, Tooltip, Typography } from 'antd'
import dayjs, { type Dayjs } from 'dayjs'
import type { RepositoryFilters, RepositoryQuerySuccess, TimeRangePreset } from '@shared/models'
import { authorKey } from '@shared/models'
import { customDayBounds } from '@shared/time-range'

const timePresets: Array<{ label: string; value: TimeRangePreset }> = [
  { label: '本周', value: 'thisWeek' },
  { label: '上周', value: 'lastWeek' },
  { label: '本月', value: 'thisMonth' },
  { label: '上月', value: 'lastMonth' },
  { label: '自定义', value: 'custom' }
]

interface FilterBarProps {
  filters: RepositoryFilters
  query: RepositoryQuerySuccess | null
  copying?: boolean
  refreshing?: boolean
  canCopy: boolean
  onChange: (filters: RepositoryFilters) => void
  onRefresh: () => void
  onCopy: () => void
}

export function FilterBar({
  filters,
  query,
  copying,
  refreshing,
  canCopy,
  onChange,
  onRefresh,
  onCopy
}: FilterBarProps): React.JSX.Element {
  const branches = query?.branches ?? []
  const authors = query?.authors ?? []
  const authorsFilter = query?.authorsFilter ?? filters.authors
  const branchValue = query?.resolvedBranch ?? filters.branch ?? undefined

  const selectedAuthorKeys =
    authorsFilter.mode === 'all' ? authors.map(authorKey) : authorsFilter.authors.map(authorKey)

  const customValue: [Dayjs, Dayjs] | null =
    filters.timeRange.preset === 'custom' &&
    filters.timeRange.customStart &&
    filters.timeRange.customEnd
      ? [dayjs(filters.timeRange.customStart), dayjs(filters.timeRange.customEnd)]
      : null

  const patch = (partial: Partial<RepositoryFilters>): void => {
    onChange({ ...filters, ...partial })
  }

  const onAuthorsChange = (keys: string[]): void => {
    if (keys.length === 0) {
      patch({ authors: { mode: 'selected', authors: [] } })
      return
    }
    if (authors.length > 0 && keys.length === authors.length) {
      patch({ authors: { mode: 'all' } })
      return
    }
    const selected = authors.filter((author) => keys.includes(authorKey(author)))
    patch({ authors: { mode: 'selected', authors: selected } })
  }

  return (
    <div className="flex flex-col gap-3 border-b border-[var(--ant-color-border-secondary)] bg-[var(--ant-color-bg-container)] px-4 py-3">
      <div
        className="flex flex-wrap items-start justify-between gap-3"
        style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
      >
        <div className="min-w-0">
          <Typography.Title level={4} className="!mb-0 truncate select-none">
            {query?.name ?? '未选择仓库'}
          </Typography.Title>
          {query ? (
            <Typography.Text type="secondary" className="text-xs select-none">
              {query.path}
            </Typography.Text>
          ) : null}
        </div>
        <Space style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}>
          <Button icon={<ReloadOutlined />} loading={refreshing} onClick={onRefresh}>
            刷新
          </Button>
          <Tooltip title={canCopy ? '复制当前范围 Markdown' : '当前范围无提交'}>
            <Button
              type="primary"
              icon={<CopyOutlined />}
              disabled={!canCopy || refreshing}
              loading={copying}
              onClick={onCopy}
            >
              复制 Markdown
            </Button>
          </Tooltip>
        </Space>
      </div>

      <div
        className="flex flex-wrap items-center gap-3"
        style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
      >
        <Select
          className="min-w-40"
          placeholder="分支"
          value={branchValue}
          disabled={refreshing}
          options={branches.map((branch) => ({ label: branch, value: branch }))}
          onChange={(branch: string) => patch({ branch })}
          showSearch
          optionFilterProp="label"
        />

        <Select
          className="min-w-64"
          mode="multiple"
          allowClear
          maxTagCount="responsive"
          placeholder="作者"
          value={selectedAuthorKeys}
          disabled={refreshing}
          options={authors.map((author) => ({
            label: `${author.name} <${author.email}>`,
            value: authorKey(author)
          }))}
          onChange={onAuthorsChange}
          filterOption={(input, option) =>
            String(option?.label ?? '')
              .toLowerCase()
              .includes(input.toLowerCase())
          }
        />

        <Select
          className="min-w-28"
          value={filters.timeRange.preset}
          disabled={refreshing}
          options={timePresets}
          onChange={(preset: TimeRangePreset) => {
            if (preset === 'custom') {
              const end = dayjs()
              const start = end.startOf('day')
              const bounds = customDayBounds(start.toDate(), end.toDate())
              patch({
                timeRange: {
                  preset: 'custom',
                  customStart: bounds.start.toISOString(),
                  customEnd: bounds.end.toISOString()
                }
              })
              return
            }
            patch({ timeRange: { preset } })
          }}
        />

        {filters.timeRange.preset === 'custom' ? (
          <DatePicker.RangePicker
            value={customValue}
            disabled={refreshing}
            allowClear={false}
            onChange={(dates) => {
              if (!dates?.[0] || !dates[1]) return
              const bounds = customDayBounds(dates[0].toDate(), dates[1].toDate())
              patch({
                timeRange: {
                  preset: 'custom',
                  customStart: bounds.start.toISOString(),
                  customEnd: bounds.end.toISOString()
                }
              })
            }}
          />
        ) : null}

        <Space size="small">
          <Switch
            checked={filters.includeMerge}
            disabled={refreshing}
            onChange={(includeMerge) => patch({ includeMerge })}
          />
          <Typography.Text>包含 merge</Typography.Text>
        </Space>
      </div>
    </div>
  )
}
