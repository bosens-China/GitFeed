import { useMemo } from 'react'
import {
  Alert,
  Button,
  Collapse,
  Descriptions,
  Empty,
  Flex,
  List,
  Modal,
  Space,
  Spin,
  Tabs,
  Tag,
  Tooltip,
  Typography
} from 'antd'
import { useQuery } from '@tanstack/react-query'
import { Binary, FileCode2, GitBranch, GitCommitHorizontal, GitMerge } from 'lucide-react'
import dayjs from 'dayjs'
import { useTranslation } from 'react-i18next'
import type { CommitItem, FileChangeStatus } from '@shared/models'
import { parseUnifiedDiff, type DiffSideLine, type ParsedDiffFile } from '@shared/unified-diff'

interface CommitDetailsModalProps {
  commit: CommitItem | null
  onClose: () => void
}

function statusColor(status: FileChangeStatus): string {
  if (status === 'A') return 'green'
  if (status === 'D') return 'red'
  if (status === 'R' || status === 'C') return 'purple'
  return 'blue'
}

function diffLineClass(line: DiffSideLine | null): string {
  if (line?.kind === 'addition') return 'bg-[var(--ant-color-success-bg)]'
  if (line?.kind === 'deletion') return 'bg-[var(--ant-color-error-bg)]'
  return 'bg-[var(--ant-color-bg-container)]'
}

function DiffSide({ line }: { line: DiffSideLine | null }): React.JSX.Element {
  return (
    <div className={`grid min-w-0 grid-cols-[3.5rem_minmax(0,1fr)] ${diffLineClass(line)}`}>
      <span className="select-none border-r border-[var(--ant-color-border-secondary)] px-2 py-0.5 text-right text-[var(--ant-color-text-quaternary)]">
        {line?.lineNumber ?? ''}
      </span>
      <pre className="m-0 overflow-visible whitespace-pre px-2 py-0.5 font-mono text-xs leading-5 text-[var(--ant-color-text)]">
        {line?.content ?? ''}
      </pre>
    </div>
  )
}

function FileDiff({ file }: { file: ParsedDiffFile }): React.JSX.Element {
  const { t } = useTranslation()
  if (file.binary) {
    return (
      <Empty
        image={Empty.PRESENTED_IMAGE_SIMPLE}
        description={t('commitDetails.binaryDiff', { defaultValue: '二进制文件不支持文本预览' })}
      />
    )
  }
  if (file.hunks.length === 0) {
    return (
      <Empty
        image={Empty.PRESENTED_IMAGE_SIMPLE}
        description={t('commitDetails.noTextDiff', { defaultValue: '该文件没有可展示的文本差异' })}
      />
    )
  }

  return (
    <div className="overflow-auto rounded border border-[var(--ant-color-border-secondary)] font-mono text-xs">
      <div className="sticky top-0 z-10 grid min-w-[900px] grid-cols-2 border-b border-[var(--ant-color-border-secondary)] bg-[var(--ant-color-fill-quaternary)] font-sans text-xs font-medium text-[var(--ant-color-text-secondary)]">
        <span className="border-r border-[var(--ant-color-border-secondary)] px-3 py-2">
          {file.oldPath ?? t('commitDetails.notApplicable', { defaultValue: '无（新增文件）' })}
        </span>
        <span className="px-3 py-2">
          {file.newPath ?? t('commitDetails.notApplicable', { defaultValue: '无（删除文件）' })}
        </span>
      </div>
      <div className="min-w-[900px]">
        {file.hunks.map((hunk, hunkIndex) => (
          <div key={`${hunk.header}\u0000${hunkIndex}`}>
            <div className="border-y border-[var(--ant-color-border-secondary)] bg-[var(--ant-color-info-bg)] px-3 py-1.5 text-[var(--ant-color-primary)]">
              {hunk.header}
            </div>
            {hunk.rows.map((row, rowIndex) => (
              <div
                key={rowIndex}
                className="grid grid-cols-2 border-b border-[var(--ant-color-border-secondary)] last:border-b-0"
              >
                <div className="min-w-0 border-r border-[var(--ant-color-border-secondary)]">
                  <DiffSide line={row.oldLine} />
                </div>
                <div className="min-w-0">
                  <DiffSide line={row.newLine} />
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}

export function CommitDetailsModal({
  commit,
  onClose
}: CommitDetailsModalProps): React.JSX.Element {
  const { t } = useTranslation()

  const diffQuery = useQuery({
    queryKey: ['commit-diff', commit?.repoId, commit?.hash],
    queryFn: () => window.api.getCommitDiff(commit!.repoId!, commit!.hash),
    enabled: Boolean(commit?.repoId && commit?.hash),
    staleTime: Infinity,
    retry: false
  })
  const parsedFiles = useMemo(
    () => (diffQuery.data ? parseUnifiedDiff(diffQuery.data.patch) : []),
    [diffQuery.data]
  )

  const additions = commit?.files.reduce((total, file) => total + (file.additions ?? 0), 0) ?? 0
  const deletions = commit?.files.reduce((total, file) => total + (file.deletions ?? 0), 0) ?? 0

  return (
    <Modal
      open={Boolean(commit)}
      onCancel={onClose}
      width="min(1200px, calc(100vw - 48px))"
      centered
      destroyOnHidden
      title={
        <span className="flex items-center gap-2">
          <GitCommitHorizontal size={18} className="text-[var(--ant-color-primary)]" />
          <span>{t('commitDetails.title', { defaultValue: '提交详情' })}</span>
          {commit && (
            <Tag bordered={false} className="m-0 font-mono text-xs">
              {commit.shortHash}
            </Tag>
          )}
        </span>
      }
      footer={
        <Button type="primary" onClick={onClose}>
          {t('common.close', { defaultValue: '关闭' })}
        </Button>
      }
      styles={{ body: { maxHeight: 'calc(100vh - 180px)', overflow: 'auto' } }}
    >
      {commit && (
        <Tabs
          defaultActiveKey="diff"
          items={[
            {
              key: 'diff',
              label: t('commitDetails.diffTab', { defaultValue: '代码差异' }),
              children: (
                <div className="min-h-48 pt-1">
                  {!commit.repoId ? (
                    <Alert
                      type="warning"
                      showIcon
                      message={t('commitDetails.diffUnavailable', {
                        defaultValue: '缺少工程信息，无法读取本地 Diff'
                      })}
                    />
                  ) : diffQuery.isLoading ? (
                    <div className="flex min-h-52 items-center justify-center">
                      <Spin
                        tip={t('commitDetails.loadingDiff', { defaultValue: '正在读取本地 Diff…' })}
                      />
                    </div>
                  ) : diffQuery.error ? (
                    <Alert
                      type="error"
                      showIcon
                      message={t('commitDetails.diffLoadFailed', { defaultValue: 'Diff 加载失败' })}
                      description={(diffQuery.error as Error).message}
                      action={
                        <Button size="small" onClick={() => void diffQuery.refetch()}>
                          {t('common.retry', { defaultValue: '重试' })}
                        </Button>
                      }
                    />
                  ) : parsedFiles.length === 0 ? (
                    <Empty
                      image={Empty.PRESENTED_IMAGE_SIMPLE}
                      description={t('commitDetails.emptyDiff', {
                        defaultValue: '该提交没有文本差异'
                      })}
                    />
                  ) : (
                    <Collapse
                      defaultActiveKey={parsedFiles.map((_, index) => String(index))}
                      items={parsedFiles.map((file, index) => ({
                        key: String(index),
                        label: (
                          <span className="font-mono text-xs">
                            {file.newPath ??
                              file.oldPath ??
                              t('commitDetails.unknownFile', { defaultValue: '未知文件' })}
                          </span>
                        ),
                        children: <FileDiff file={file} />
                      }))}
                    />
                  )}
                </div>
              )
            },
            {
              key: 'details',
              label: t('commitDetails.infoTab', { defaultValue: '提交信息' }),
              children: (
                <Flex vertical gap={16} className="pt-2">
                  <div>
                    <Typography.Text type="secondary" className="text-xs">
                      {t('commitDetails.message', { defaultValue: '提交信息' })}
                    </Typography.Text>
                    <Typography.Paragraph className="!mt-1.5 !mb-0 max-h-32 overflow-auto whitespace-pre-wrap break-words rounded-md bg-[var(--ant-color-fill-quaternary)] px-3 py-2.5 text-sm leading-relaxed">
                      {commit.message}
                    </Typography.Paragraph>
                  </div>

                  <Descriptions
                    size="small"
                    column={1}
                    labelStyle={{ width: 88, color: 'var(--ant-color-text-tertiary)' }}
                    items={[
                      {
                        key: 'hash',
                        label: t('commitDetails.hash', { defaultValue: '完整 Hash' }),
                        children: (
                          <Typography.Text
                            code
                            copyable={{
                              text: commit.hash,
                              tooltips: [
                                t('commitList.copyHashTooltip', { defaultValue: '复制完整 Hash' }),
                                t('commitList.hashCopied', { defaultValue: '已复制完整 Hash' })
                              ]
                            }}
                            className="break-all text-xs"
                          >
                            {commit.hash}
                          </Typography.Text>
                        )
                      },
                      {
                        key: 'repository',
                        label: t('commitDetails.repository', { defaultValue: '工程' }),
                        children: commit.repoName || '—'
                      },
                      {
                        key: 'author',
                        label: t('commitDetails.author', { defaultValue: '作者' }),
                        children: (
                          <span className="break-all">
                            {commit.authorName} &lt;{commit.authorEmail}&gt;
                          </span>
                        )
                      },
                      {
                        key: 'authoredAt',
                        label: t('commitDetails.authoredAt', { defaultValue: '提交时间' }),
                        children: (
                          <Typography.Text className="font-mono text-xs">
                            {dayjs(commit.authoredAt).format('YYYY-MM-DD HH:mm:ss')}
                          </Typography.Text>
                        )
                      },
                      {
                        key: 'branch',
                        label: t('commitDetails.branch', { defaultValue: '分支' }),
                        children: (
                          <Space size={8} wrap>
                            <Tag
                              bordered={false}
                              icon={<GitBranch size={12} />}
                              className="m-0 font-mono"
                            >
                              {commit.branch}
                            </Tag>
                            {commit.isMerge && (
                              <Tag color="purple" bordered={false} icon={<GitMerge size={12} />}>
                                Merge
                              </Tag>
                            )}
                          </Space>
                        )
                      }
                    ]}
                  />

                  <div>
                    <Flex justify="space-between" align="center" gap={8} wrap className="mb-2">
                      <Typography.Text strong className="inline-flex items-center gap-1.5 text-sm">
                        <FileCode2 size={15} className="text-[var(--ant-color-primary)]" />
                        {t('commitDetails.files', {
                          count: commit.files.length,
                          defaultValue: `${commit.files.length} 个变更文件`
                        })}
                      </Typography.Text>
                      <Space size={8} className="font-mono text-xs">
                        <span className="font-medium text-emerald-500">+{additions}</span>
                        <span className="font-medium text-rose-500">-{deletions}</span>
                      </Space>
                    </Flex>

                    {commit.files.length === 0 ? (
                      <Empty
                        image={Empty.PRESENTED_IMAGE_SIMPLE}
                        description={t('commitDetails.noFiles', {
                          defaultValue: '没有文件变更记录'
                        })}
                      />
                    ) : (
                      <List
                        size="small"
                        bordered
                        dataSource={commit.files}
                        className="max-h-64 overflow-auto font-mono text-xs"
                        renderItem={(file) => (
                          <List.Item
                            key={`${file.previousPath ?? ''}\u0000${file.path}`}
                            extra={
                              file.binary ? (
                                <Tooltip
                                  title={t('commitDetails.binaryFile', {
                                    defaultValue: '二进制文件'
                                  })}
                                >
                                  <Binary
                                    size={14}
                                    className="text-[var(--ant-color-text-tertiary)]"
                                  />
                                </Tooltip>
                              ) : (
                                <Space size={8}>
                                  <span className="font-medium text-emerald-500">
                                    +{file.additions ?? 0}
                                  </span>
                                  <span className="font-medium text-rose-500">
                                    -{file.deletions ?? 0}
                                  </span>
                                </Space>
                              )
                            }
                          >
                            <Space size={8} align="start">
                              <Tag
                                color={statusColor(file.status)}
                                className="m-0 px-1 py-0 text-[10px] font-semibold uppercase"
                              >
                                {file.status}
                              </Tag>
                              <Typography.Text className="break-all text-xs" type="secondary">
                                {file.previousPath && file.previousPath !== file.path
                                  ? `${file.previousPath} → ${file.path}`
                                  : file.path}
                              </Typography.Text>
                            </Space>
                          </List.Item>
                        )}
                      />
                    )}
                  </div>
                </Flex>
              )
            }
          ]}
        />
      )}
    </Modal>
  )
}
