import { Button, Collapse, Space, Tag, Tooltip, Typography } from 'antd'
import { FileText, GitBranch, GitMerge } from 'lucide-react'
import dayjs from 'dayjs'
import { useTranslation } from 'react-i18next'
import type { CommitItem } from '@shared/models'
import { parseCommitCategory } from '@shared/commit-category'
import { computeStats } from '@shared/commit-utils'
import { CursorTooltip } from '@renderer/components/CursorTooltip'

export function CommitRow({
  commit,
  onSelect
}: {
  commit: CommitItem
  onSelect: (commit: CommitItem) => void
}): React.JSX.Element {
  const { t } = useTranslation()
  const { additions: totalAdd, deletions: totalDel } = computeStats([commit])
  const category = parseCommitCategory(commit.message)
  return (
    <CursorTooltip title={dayjs(commit.authoredAt).format('YYYY-MM-DD HH:mm:ss')}>
      <div className="group/commit relative py-2.5 px-3.5 -mx-3.5 rounded-lg border border-transparent hover:border-[var(--ant-color-border-secondary)] hover:bg-[var(--ant-color-fill-secondary)] transition-all duration-150 flex flex-col gap-1.5 cursor-default">
        {/* 提交标题与类别 */}
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

          <Space size={4} className="shrink-0">
            <Typography.Text type="secondary" className="font-mono text-xs cursor-default">
              {dayjs(commit.authoredAt).format('HH:mm')}
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
                onClick={() => onSelect(commit)}
                className="font-mono text-xs !h-6 px-1.5"
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
            {t('commitDetails.branch', { defaultValue: '查询分支' })}：{commit.branch}
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
                              color={f.status === 'A' ? 'green' : f.status === 'D' ? 'red' : 'blue'}
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
                              <span className="text-emerald-500 font-medium">+{f.additions}</span>
                            )}
                            {f.deletions !== null && (
                              <span className="text-rose-500 font-medium">-{f.deletions}</span>
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
}
