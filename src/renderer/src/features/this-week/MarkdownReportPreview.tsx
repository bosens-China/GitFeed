import { Empty } from 'antd'
import { useTranslation } from 'react-i18next'

interface MarkdownReportPreviewProps {
  markdown: string
  emptyDescription?: string
}

export function MarkdownReportPreview({
  markdown,
  emptyDescription
}: MarkdownReportPreviewProps): React.JSX.Element {
  const { t } = useTranslation()

  if (!markdown.trim()) {
    return (
      <Empty
        image={Empty.PRESENTED_IMAGE_SIMPLE}
        description={emptyDescription || t('thisWeek.noCommits', { defaultValue: '暂无周报内容' })}
        className="my-16"
      />
    )
  }

  const lines = markdown.split('\n')
  return (
    <div className="prose dark:prose-invert max-w-none p-6 font-sans text-sm leading-relaxed text-[var(--ant-color-text)] select-text cursor-text">
      {lines.map((line, idx) => {
        if (line.startsWith('# ')) {
          return (
            <h1
              key={idx}
              className="mt-2 mb-4 text-xl font-bold tracking-tight text-[var(--ant-color-text)] border-b border-[var(--ant-color-border-secondary)] pb-2"
            >
              {line.replace('# ', '')}
            </h1>
          )
        }
        if (line.startsWith('## ')) {
          return (
            <h2
              key={idx}
              className="mt-6 mb-3 text-base font-bold text-[var(--ant-color-text)] border-b border-[var(--ant-color-border-secondary)] pb-1.5"
            >
              {line.replace('## ', '')}
            </h2>
          )
        }
        if (line.startsWith('### ')) {
          return (
            <h3
              key={idx}
              className="mt-4 mb-2 text-sm font-semibold text-[var(--ant-color-primary)]"
            >
              {line.replace('### ', '')}
            </h3>
          )
        }
        if (line.startsWith('> ')) {
          return (
            <div
              key={idx}
              className="my-1 rounded border-l-3 border-[var(--ant-color-primary)] bg-[var(--ant-color-fill-quaternary)] px-3 py-1.5 text-xs text-[var(--ant-color-text-secondary)] font-mono"
            >
              {line.replace('> ', '')}
            </div>
          )
        }
        if (line.startsWith('- ')) {
          const raw = line.replace('- ', '')
          const parts = raw.split(/(`[^`]+`)/g)
          return (
            <li key={idx} className="ml-5 list-disc text-sm py-0.5 text-[var(--ant-color-text)]">
              {parts.map((p, pIdx) => {
                if (p.startsWith('`') && p.endsWith('`')) {
                  return (
                    <code
                      key={pIdx}
                      className="rounded bg-[var(--ant-color-fill-secondary)] px-1.5 py-0.5 text-xs font-mono text-[var(--ant-color-primary)]"
                    >
                      {p.slice(1, -1)}
                    </code>
                  )
                }
                return <span key={pIdx}>{p}</span>
              })}
            </li>
          )
        }
        if (!line.trim()) {
          return <div key={idx} className="h-1.5" />
        }
        return (
          <p key={idx} className="my-1 text-[var(--ant-color-text)]">
            {line}
          </p>
        )
      })}
    </div>
  )
}
