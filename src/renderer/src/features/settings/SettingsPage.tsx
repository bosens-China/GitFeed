import { useState } from 'react'
import { Spin, Tabs, Tag } from 'antd'
import { FolderGit2, Info, Settings, Sliders, UserCheck } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useWorkbench } from '@renderer/hooks/useWorkbench'
import { AboutAndDiagnosticsCard } from './AboutAndDiagnosticsCard'
import { GeneralPreferencesCard } from './GeneralPreferencesCard'
import { IdentityManagementCard } from './IdentityManagementCard'
import { RepoManagementCard } from './RepoManagementCard'

export function SettingsPage(): React.JSX.Element {
  const { t } = useTranslation()
  const { state: workbench, isLoading } = useWorkbench()
  const [activeTabKey, setActiveTabKey] = useState<string>('repos')

  if (isLoading || !workbench) {
    return (
      <div className="flex h-full items-center justify-center">
        <Spin size="large" />
      </div>
    )
  }

  const tabItems = [
    {
      key: 'repos',
      label: (
        <span className="flex items-center gap-2 font-medium">
          <FolderGit2 size={16} />
          {t('settings.tabs.repos', { defaultValue: '本地工程' })}
          <Tag bordered={false} className="ml-0.5 font-mono text-xs">
            {workbench.repositories.length}
          </Tag>
        </span>
      ),
      children: <RepoManagementCard repositories={workbench.repositories} />
    },
    {
      key: 'identities',
      label: (
        <span className="flex items-center gap-2 font-medium">
          <UserCheck size={16} />
          {t('settings.tabs.identities', { defaultValue: '我的身份' })}
          {workbench.myIdentities.length > 0 && (
            <Tag bordered={false} color="blue" className="ml-0.5 font-mono text-xs">
              {workbench.myIdentities.length}
            </Tag>
          )}
        </span>
      ),
      children: <IdentityManagementCard myIdentities={workbench.myIdentities} />
    },
    {
      key: 'preferences',
      label: (
        <span className="flex items-center gap-2 font-medium">
          <Sliders size={16} />
          {t('settings.tabs.preferences', { defaultValue: '通用偏好' })}
        </span>
      ),
      children: <GeneralPreferencesCard />
    },
    {
      key: 'about',
      label: (
        <span className="flex items-center gap-2 font-medium">
          <Info size={16} />
          {t('settings.tabs.about', { defaultValue: '关于与环境' })}
        </span>
      ),
      children: <AboutAndDiagnosticsCard />
    }
  ]

  return (
    <div className="flex h-full flex-col overflow-hidden bg-[var(--ant-color-bg-layout)]">
      {/* 顶部标题区 */}
      <div className="flex items-center gap-2.5 border-b border-[var(--ant-color-border-secondary)] bg-[var(--ant-color-bg-container)] px-6 py-4 shrink-0">
        <Settings size={18} className="text-[var(--ant-color-primary)]" />
        <span className="text-base font-semibold text-[var(--ant-color-text)]">
          {t('nav.settings', { defaultValue: '应用设置' })}
        </span>
      </div>

      {/* 主体 Tabs 内容区 */}
      <div className="min-h-0 flex-1 overflow-auto p-4 md:p-6">
        <div className="mx-auto max-w-4xl">
          <Tabs
            activeKey={activeTabKey}
            onChange={setActiveTabKey}
            items={tabItems}
            className="settings-tabs"
          />
        </div>
      </div>
    </div>
  )
}
