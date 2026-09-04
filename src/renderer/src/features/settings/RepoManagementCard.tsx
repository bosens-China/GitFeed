import { useState } from 'react'
import {
  App,
  Badge,
  Button,
  Card,
  Empty,
  Popconfirm,
  Select,
  Space,
  Switch,
  Table,
  Tooltip
} from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { FolderGit2, Plus, RefreshCw, Trash2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import type { RepositoryRecord, RepositoryStatus } from '@shared/models'
import { useWorkbench } from '@renderer/hooks/useWorkbench'

interface RepoManagementCardProps {
  repositories: RepositoryRecord[]
}

export function RepoManagementCard({ repositories }: RepoManagementCardProps): React.JSX.Element {
  const { t } = useTranslation()
  const { message } = App.useApp()
  const { addRepository, removeRepository, updateRepo, refetchWorkbench, adding } = useWorkbench()
  const [checkingId, setCheckingId] = useState<string | null>(null)

  const handleCheckStatus = async (repo: RepositoryRecord): Promise<void> => {
    setCheckingId(repo.id)
    try {
      const diag = await window.api.checkRepoStatus(repo.id)
      await refetchWorkbench()
      if (diag.status === 'available') {
        message.success(t('settings.repoAvailable', { defaultValue: '仓库正常可用' }))
      } else if (diag.status === 'empty') {
        message.info(t('settings.repoEmpty', { defaultValue: '空 Git 仓库（尚无提交）' }))
      } else {
        message.warning(diag.error || t('settings.repoUnavailable', { defaultValue: '仓库不可用' }))
      }
    } catch (err) {
      message.error(
        err instanceof Error ? err.message : t('settings.checkFailed', { defaultValue: '检测失败' })
      )
    } finally {
      setCheckingId(null)
    }
  }

  const renderStatusBadge = (status?: RepositoryStatus, errorMsg?: string): React.JSX.Element => {
    switch (status) {
      case 'available':
        return (
          <Badge status="success" text={t('settings.statusAvailable', { defaultValue: '可用' })} />
        )
      case 'empty':
        return (
          <Badge status="default" text={t('settings.statusEmpty', { defaultValue: '空仓库' })} />
        )
      case 'missing':
        return (
          <Tooltip title={errorMsg || t('errors.PATH_MISSING', { defaultValue: '路径不存在' })}>
            <Badge
              status="error"
              text={t('settings.statusMissing', { defaultValue: '路径失效' })}
            />
          </Tooltip>
        )
      case 'not_git':
        return (
          <Tooltip title={errorMsg || t('errors.NOT_GIT', { defaultValue: '非 Git 仓库' })}>
            <Badge status="error" text={t('settings.statusNotGit', { defaultValue: '非 Git' })} />
          </Tooltip>
        )
      case 'error':
        return (
          <Tooltip title={errorMsg || t('errors.GIT_ERROR', { defaultValue: '读取失败' })}>
            <Badge status="warning" text={t('settings.statusError', { defaultValue: '异常' })} />
          </Tooltip>
        )
      default:
        return (
          <Badge
            status="processing"
            text={t('settings.statusUnknown', { defaultValue: '已就绪' })}
          />
        )
    }
  }

  const columns: ColumnsType<RepositoryRecord> = [
    {
      title: t('settings.repoName', { defaultValue: '工程名称' }),
      dataIndex: 'name',
      key: 'name',
      width: 200,
      render: (name: string, record) => (
        <div className="flex flex-col gap-0.5">
          <span className="font-medium text-[var(--ant-color-text)]">{name}</span>
          <Tooltip title={record.path}>
            <span className="truncate font-mono text-[11px] text-[var(--ant-color-text-tertiary)] max-w-44">
              {record.path}
            </span>
          </Tooltip>
        </div>
      )
    },
    {
      title: t('settings.repoStatus', { defaultValue: '状态' }),
      key: 'status',
      width: 110,
      render: (_, record) => renderStatusBadge(record.status, record.errorMessage)
    },
    {
      title: t('settings.participateReport', { defaultValue: '参与周报' }),
      key: 'enabled',
      width: 100,
      render: (_, record) => (
        <Switch
          checked={record.enabledForReport}
          onChange={(checked) => void updateRepo(record.id, { enabledForReport: checked })}
        />
      )
    },
    {
      title: t('settings.branchesTracked', { defaultValue: '分析分支' }),
      key: 'branches',
      render: (_, record) => {
        const branches = record.selectedBranches || []
        return (
          <Select
            mode="multiple"
            className="w-full min-w-36"
            placeholder={t('settings.branchesPlaceholder', { defaultValue: '主分支' })}
            value={branches}
            options={(record.availableBranches ?? branches).map((branch) => ({
              label: branch,
              value: branch
            }))}
            onChange={(selected) => void updateRepo(record.id, { selectedBranches: selected })}
          />
        )
      }
    },
    {
      title: t('common.actions', { defaultValue: '操作' }),
      key: 'actions',
      width: 100,
      align: 'right',
      render: (_, record) => (
        <Space size="middle">
          <Tooltip title={t('settings.recheck', { defaultValue: '重新检测' })}>
            <Button
              type="text"
              icon={
                <RefreshCw size={14} className={checkingId === record.id ? 'animate-spin' : ''} />
              }
              loading={checkingId === record.id}
              onClick={() => void handleCheckStatus(record)}
            />
          </Tooltip>

          <Popconfirm
            title={t('sidebar.removeConfirmTitle', {
              name: record.name,
              defaultValue: `移除「${record.name}」？`
            })}
            description={t('sidebar.removeConfirmContent', {
              defaultValue: '只会从 GitFeed 中移除，不会删除磁盘上的本地仓库。'
            })}
            okText={t('common.remove', { defaultValue: '移除' })}
            cancelText={t('common.cancel', { defaultValue: '取消' })}
            okButtonProps={{ danger: true }}
            onConfirm={() => removeRepository(record.id)}
          >
            <Button type="text" danger icon={<Trash2 size={14} />} />
          </Popconfirm>
        </Space>
      )
    }
  ]

  return (
    <Card
      title={
        <div className="flex items-center justify-between">
          <Space size={8}>
            <FolderGit2 size={18} className="text-[var(--ant-color-primary)]" />
            <span>{t('settings.repoManagement', { defaultValue: '本地工程管理' })}</span>
          </Space>
          <Button type="primary" icon={<Plus size={14} />} loading={adding} onClick={addRepository}>
            {t('sidebar.addBtn', { defaultValue: '添加仓库' })}
          </Button>
        </div>
      }
      variant="outlined"
      className="shadow-xs bg-[var(--ant-color-bg-container)]"
    >
      <Table
        rowKey="id"
        pagination={false}
        columns={columns}
        dataSource={repositories}
        locale={{
          emptyText: (
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description={t('sidebar.noRepositories', { defaultValue: '暂无已添加的本地工程' })}
            />
          )
        }}
      />
    </Card>
  )
}
