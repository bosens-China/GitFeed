import { App, Button, Card, Space } from 'antd'
import { Copy, FileText } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { buildCommitsWeeklyReportMarkdown } from '@shared/markdown'
import type { CommitItem } from '@shared/models'
import { MarkdownReportPreview } from './MarkdownReportPreview'

interface ProjectReportTabProps {
  repoName: string
  timeRangeLabel?: string
  commits: CommitItem[]
}

export function ProjectReportTab({
  repoName,
  timeRangeLabel,
  commits
}: ProjectReportTabProps): React.JSX.Element {
  const { t } = useTranslation()
  const { message } = App.useApp()

  const markdownText = buildCommitsWeeklyReportMarkdown(commits, {
    title: `${repoName} 工作周报`,
    timeRangeLabel,
    groupMode: 'singleRepo'
  })

  const handleCopy = async (): Promise<void> => {
    if (!markdownText.trim()) {
      message.info(t('thisWeek.noCommitsToCopy', { defaultValue: '当前范围无提交，无法生成周报' }))
      return
    }
    try {
      await navigator.clipboard.writeText(markdownText)
      message.success(
        t('thisWeek.copyProjectReportSuccess', {
          defaultValue: '已复制项目周报 Markdown 到剪贴板。'
        })
      )
    } catch {
      message.error(t('workbench.copyFailed', { defaultValue: '复制失败' }))
    }
  }

  return (
    <Card
      variant="outlined"
      className="shadow-xs bg-[var(--ant-color-bg-container)] mt-2"
      title={
        <div className="flex flex-wrap items-center justify-between gap-3 py-1">
          <Space size={8}>
            <FileText size={16} className="text-[var(--ant-color-primary)]" />
            <span className="font-semibold text-sm">
              {repoName} {t('thisWeek.reportPreviewTitle', { defaultValue: '项目周报' })}
            </span>
          </Space>

          <Button
            type="primary"
            icon={<Copy size={14} />}
            disabled={commits.length === 0}
            onClick={handleCopy}
          >
            {t('thisWeek.copyProjectReport', { defaultValue: '复制周报 Markdown' })}
          </Button>
        </div>
      }
    >
      <div className="min-h-[360px] rounded border border-[var(--ant-color-border-secondary)] bg-[var(--ant-color-bg-container)]">
        <MarkdownReportPreview
          markdown={markdownText}
          emptyDescription={t('thisWeek.noCommits', { defaultValue: '当前筛选范围内无提交记录' })}
        />
      </div>
    </Card>
  )
}
