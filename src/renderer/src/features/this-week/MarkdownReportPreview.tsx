import { Children, isValidElement, useMemo, useState, type ReactNode } from 'react'
import { Button, Empty, Tooltip } from 'antd'
import dayjs from 'dayjs'
import ReactMarkdown, { type Components } from 'react-markdown'
import { useTranslation } from 'react-i18next'
import type { CommitItem } from '@shared/models'
import { commitPreviewLink } from '@shared/markdown'
import { CursorTooltip } from '@renderer/components/CursorTooltip'
import { CommitDetailsModal } from '../commits/CommitDetailsModal'

interface MarkdownReportPreviewProps {
  markdown: string
  commits: CommitItem[]
  emptyDescription?: string
}

function findLinkedCommit(
  node: ReactNode,
  commits: Map<string, CommitItem>
): CommitItem | undefined {
  if (!node || typeof node === 'string' || typeof node === 'number') return undefined
  if (isValidElement<{ href?: string; children?: ReactNode }>(node)) {
    return commits.get(node.props.href ?? '') ?? findLinkedCommit(node.props.children, commits)
  }
  for (const child of Children.toArray(node)) {
    const commit = findLinkedCommit(child, commits)
    if (commit) return commit
  }
  return undefined
}

export function MarkdownReportPreview({
  markdown,
  commits,
  emptyDescription
}: MarkdownReportPreviewProps): React.JSX.Element {
  const { t } = useTranslation()
  const [selectedCommit, setSelectedCommit] = useState<CommitItem | null>(null)
  const commitsByLink = useMemo(
    () => new Map(commits.map((commit) => [commitPreviewLink(commit), commit])),
    [commits]
  )

  if (!markdown.trim()) {
    return (
      <Empty
        image={Empty.PRESENTED_IMAGE_SIMPLE}
        description={emptyDescription || t('thisWeek.noCommits', { defaultValue: '暂无周报内容' })}
        className="my-16"
      />
    )
  }

  const components: Components = {
    h1: ({ children }) => (
      <h1 className="mt-2 mb-4 border-b border-[var(--ant-color-border-secondary)] pb-2 text-xl font-bold tracking-tight text-[var(--ant-color-text)]">
        {children}
      </h1>
    ),
    h2: ({ children }) => (
      <h2 className="mt-6 mb-3 border-b border-[var(--ant-color-border-secondary)] pb-1.5 text-base font-bold text-[var(--ant-color-text)]">
        {children}
      </h2>
    ),
    h3: ({ children }) => (
      <h3 className="mt-4 mb-2 text-sm font-semibold text-[var(--ant-color-primary)]">
        {children}
      </h3>
    ),
    blockquote: ({ children }) => (
      <blockquote className="my-2 rounded border-l-3 border-[var(--ant-color-primary)] bg-[var(--ant-color-fill-quaternary)] px-3 py-1.5 font-mono text-xs text-[var(--ant-color-text-secondary)] [&>p]:m-0">
        {children}
      </blockquote>
    ),
    ul: ({ children }) => <ul className="my-2 pl-5">{children}</ul>,
    li: ({ children }) => {
      const commit = findLinkedCommit(children, commitsByLink)
      const item = (
        <li className="my-1 -mx-2 rounded-md px-2 py-1 list-disc text-sm text-[var(--ant-color-text)] border border-transparent hover:border-[var(--ant-color-border-secondary)] hover:bg-[var(--ant-color-fill-secondary)] transition-all duration-150 cursor-default">
          {children}
        </li>
      )
      return commit ? (
        <CursorTooltip title={dayjs(commit.authoredAt).format('YYYY-MM-DD HH:mm:ss')}>
          {item}
        </CursorTooltip>
      ) : (
        item
      )
    },
    p: ({ children }) => <p className="my-1 text-[var(--ant-color-text)]">{children}</p>,
    pre: ({ children }) => (
      <pre className="my-2 overflow-auto rounded-md bg-[var(--ant-color-fill-quaternary)] p-3 font-mono text-xs leading-relaxed">
        {children}
      </pre>
    ),
    a: ({ children, href }) => {
      const commit = commitsByLink.get(href ?? '')

      if (commit) {
        return (
          <Tooltip
            title={t('commitDetails.openTooltip', {
              hash: commit.shortHash,
              defaultValue: `查看提交 ${commit.shortHash} 的详情`
            })}
          >
            <Button
              type="link"
              size="small"
              className="mx-0.5 !h-auto !bg-[var(--ant-color-fill-secondary)] !px-1.5 !py-0.5 font-mono text-xs"
              onClick={() => setSelectedCommit(commit)}
            >
              {commit.shortHash}
            </Button>
          </Tooltip>
        )
      }

      return <a href={href}>{children}</a>
    },
    code: ({ children, className }) => (
      <code
        className={`${className ?? ''} rounded bg-[var(--ant-color-fill-secondary)] px-1.5 py-0.5 font-mono text-xs text-[var(--ant-color-primary)]`}
      >
        {children}
      </code>
    )
  }

  return (
    <>
      <div className="max-w-none cursor-default select-text p-6 font-sans text-sm leading-relaxed text-[var(--ant-color-text)]">
        <ReactMarkdown components={components} skipHtml>
          {markdown}
        </ReactMarkdown>
      </div>
      <CommitDetailsModal commit={selectedCommit} onClose={() => setSelectedCommit(null)} />
    </>
  )
}
