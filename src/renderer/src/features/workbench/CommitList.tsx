import { useRef, useState } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'
import { App, Collapse, Empty, Tag, Typography } from 'antd'
import type { CommitItem, FileChange } from '@shared/models'

interface CommitListProps {
  commits: CommitItem[]
  branch: string | null
  emptyReason?: 'no-branch' | 'no-authors' | 'no-results'
}

function formatLocalTime(iso: string): string {
  const date = new Date(iso)
  const pad = (n: number): string => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`
}

function statusColor(status: FileChange['status']): string {
  switch (status) {
    case 'A':
      return 'success'
    case 'D':
      return 'error'
    case 'R':
    case 'C':
      return 'processing'
    default:
      return 'default'
  }
}

function CommitCard({ commit }: { commit: CommitItem }): React.JSX.Element {
  const { message } = App.useApp()
  const [expanded, setExpanded] = useState(false)
  const title = commit.message.split('\n')[0] || '(无标题)'
  const body = commit.message.includes('\n')
    ? commit.message.slice(commit.message.indexOf('\n') + 1).trim()
    : ''

  const copyHash = async (): Promise<void> => {
    try {
      await navigator.clipboard.writeText(commit.hash)
      message.success('已复制完整 hash')
    } catch {
      message.error('复制失败')
    }
  }

  return (
    <div className="rounded-lg border border-[var(--ant-color-border-secondary)] bg-[var(--ant-color-bg-container)] p-3">
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <Typography.Text
          code
          className="cursor-pointer"
          onClick={() => {
            void copyHash()
          }}
        >
          {commit.shortHash}
        </Typography.Text>
        <Typography.Text strong className="flex-1">
          {title}
        </Typography.Text>
        {commit.isMerge ? <Tag color="purple">merge</Tag> : null}
      </div>

      <div className="mb-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-[var(--ant-color-text-secondary)]">
        <span>
          {commit.authorName} &lt;{commit.authorEmail}&gt;
        </span>
        <span>{formatLocalTime(commit.authoredAt)}</span>
        <span>分支：{commit.branch}</span>
      </div>

      {body ? (
        <Typography.Paragraph
          className="!mb-2 whitespace-pre-wrap text-sm"
          ellipsis={
            expanded
              ? false
              : {
                  rows: 3,
                  expandable: true,
                  symbol: '展开',
                  onExpand: () => setExpanded(true)
                }
          }
        >
          {body}
        </Typography.Paragraph>
      ) : null}

      <Collapse
        size="small"
        items={[
          {
            key: 'files',
            label: `文件（${commit.files.length}）`,
            children:
              commit.files.length === 0 ? (
                <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="无文件变更" />
              ) : (
                <ul className="m-0 list-none p-0">
                  {commit.files.map((file) => (
                    <li
                      key={`${file.status}-${file.path}`}
                      className="flex items-center gap-2 border-b border-[var(--ant-color-border-secondary)] py-1 text-xs last:border-b-0"
                    >
                      <Tag color={statusColor(file.status)} className="!mr-0">
                        {file.status}
                      </Tag>
                      <span className="min-w-0 flex-1 break-all">
                        {file.previousPath && file.previousPath !== file.path
                          ? `${file.previousPath} → ${file.path}`
                          : file.path}
                      </span>
                      <span className="shrink-0 opacity-60">
                        {file.binary ? 'binary' : `+${file.additions ?? 0}/-${file.deletions ?? 0}`}
                      </span>
                    </li>
                  ))}
                </ul>
              )
          }
        ]}
      />
    </div>
  )
}

export function CommitList({
  commits,
  branch,
  emptyReason = 'no-results'
}: CommitListProps): React.JSX.Element {
  const parentRef = useRef<HTMLDivElement>(null)
  const virtualizer = useVirtualizer({
    count: commits.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 180,
    overscan: 6
  })

  if (!branch || emptyReason === 'no-branch') {
    return (
      <div className="flex flex-1 items-center justify-center p-8">
        <Empty description="仓库没有可用分支" />
      </div>
    )
  }

  if (commits.length === 0) {
    const description =
      emptyReason === 'no-authors' ? '请选择至少一位作者' : '当前筛选范围内没有提交'
    return (
      <div className="flex flex-1 items-center justify-center p-8">
        <Empty description={description} />
      </div>
    )
  }

  return (
    <div ref={parentRef} className="min-h-0 flex-1 overflow-auto px-4 py-4">
      <div className="relative w-full" style={{ height: `${virtualizer.getTotalSize()}px` }}>
        {virtualizer.getVirtualItems().map((item) => {
          const commit = commits[item.index]
          return (
            <div
              key={commit.hash}
              data-index={item.index}
              ref={virtualizer.measureElement}
              className="absolute left-0 top-0 w-full pb-3"
              style={{ transform: `translateY(${item.start}px)` }}
            >
              <CommitCard commit={commit} />
            </div>
          )
        })}
      </div>
    </div>
  )
}
