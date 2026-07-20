import { DeleteOutlined, PlusOutlined, SettingOutlined } from '@ant-design/icons'
import { Button, Empty, Modal, Tooltip, Typography } from 'antd'
import type { RepositoryRecord } from '@shared/models'

interface RepositorySidebarProps {
  repositories: RepositoryRecord[]
  activeId: string | null
  adding?: boolean
  onAdd: () => void
  onSelect: (id: string) => void
  onRemove: (id: string) => void
  onOpenSettings: () => void
}

export function RepositorySidebar({
  repositories,
  activeId,
  adding,
  onAdd,
  onSelect,
  onRemove,
  onOpenSettings
}: RepositorySidebarProps): React.JSX.Element {
  const isMac = window.electron.process.platform === 'darwin'

  const confirmRemove = (repo: RepositoryRecord): void => {
    Modal.confirm({
      title: `移除「${repo.name}」？`,
      content: '只会从 GitFeed 工作台移除，不会删除磁盘上的本地仓库。',
      okText: '移除',
      okButtonProps: { danger: true },
      cancelText: '取消',
      onOk: () => onRemove(repo.id)
    })
  }

  return (
    <aside className="flex h-full w-64 shrink-0 flex-col border-r border-[var(--ant-color-border-secondary)] bg-[var(--ant-color-bg-container)]">
      <div
        className={`app-drag px-4 ${isMac ? 'pt-10 pb-3' : 'py-3'}`}
        style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
      >
        <Typography.Title level={4} className="!mb-0 select-none">
          GitFeed
        </Typography.Title>
      </div>

      <div className="px-3 pb-2" style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}>
        <Button type="primary" block icon={<PlusOutlined />} loading={adding} onClick={onAdd}>
          添加仓库
        </Button>
      </div>

      <div
        className="min-h-0 flex-1 overflow-auto px-2 pb-3"
        style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
      >
        {repositories.length === 0 ? (
          <Empty className="mt-8" image={Empty.PRESENTED_IMAGE_SIMPLE} description="还没有仓库" />
        ) : (
          <ul className="m-0 list-none p-0">
            {repositories.map((repo) => {
              const active = repo.id === activeId
              return (
                <li key={repo.id} className="mb-1">
                  <div
                    className={`group flex cursor-pointer items-start gap-1 rounded-md px-2 py-2 ${
                      active
                        ? 'bg-[var(--ant-color-primary-bg)] text-[var(--ant-color-primary)]'
                        : 'hover:bg-[var(--ant-color-fill-tertiary)]'
                    }`}
                    onClick={() => onSelect(repo.id)}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium">{repo.name}</div>
                      <Tooltip title={repo.path}>
                        <div className="truncate text-xs opacity-60">{repo.path}</div>
                      </Tooltip>
                    </div>
                    <Button
                      type="text"
                      size="small"
                      className="opacity-0 group-hover:opacity-100"
                      danger
                      icon={<DeleteOutlined />}
                      onClick={(event) => {
                        event.stopPropagation()
                        confirmRemove(repo)
                      }}
                    />
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </div>

      <div
        className="border-t border-[var(--ant-color-border-secondary)] px-2 py-2"
        style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
      >
        <Button
          type="text"
          block
          className="!justify-start"
          icon={<SettingOutlined />}
          onClick={onOpenSettings}
        >
          设置
        </Button>
      </div>
    </aside>
  )
}
