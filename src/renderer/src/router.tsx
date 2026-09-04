import { useState } from 'react'
import {
  Outlet,
  RouterProvider,
  createHashHistory,
  createRootRoute,
  createRoute,
  createRouter,
  useLocation,
  useNavigate,
  useParams
} from '@tanstack/react-router'
import { App, Button, Dropdown, Layout, Menu, Tooltip, Typography } from 'antd'
import type { MenuProps } from 'antd'
import {
  FileText,
  FolderGit2,
  LayoutGrid,
  MoreHorizontal,
  Pencil,
  Plus,
  Settings,
  Trash2
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import type { RepositoryRecord } from '@shared/models'
import { useTheme } from '@renderer/theme/context'
import { useWorkbench } from '@renderer/hooks/useWorkbench'
import { WelcomePage } from '@renderer/features/welcome/WelcomePage'
import { ThisWeekPage } from '@renderer/features/this-week/ThisWeekPage'
import { WeeklyReportPage } from '@renderer/features/weekly-report/WeeklyReportPage'
import { SettingsPage } from '@renderer/features/settings/SettingsPage'
import { EditRepoModal } from '@renderer/features/welcome/EditRepoModal'

const { Sider, Content } = Layout

function RootLayout(): React.JSX.Element {
  const { t } = useTranslation()
  const { isDark } = useTheme()
  const { modal } = App.useApp()
  const { state: workbench, addRepository, removeRepository, adding } = useWorkbench()
  const location = useLocation()
  const navigate = useNavigate()
  const isMac = window.api.platform === 'darwin'

  const [editingRepo, setEditingRepo] = useState<RepositoryRecord | null>(null)

  const repositories = workbench?.repositories ?? []

  // 根据当前路径自动推导高亮菜单项
  const decodedPathname = decodeURIComponent(location.pathname)
  const selectedMenuKey =
    decodedPathname === '/'
      ? 'welcome'
      : decodedPathname === '/weekly-report'
        ? 'weekly-report'
        : decodedPathname.startsWith('/project/')
          ? `repo-${decodedPathname.slice('/project/'.length)}`
          : decodedPathname === '/settings'
            ? 'settings'
            : ''

  const handleRemoveRepo = (repo: RepositoryRecord): void => {
    modal.confirm({
      title: t('sidebar.removeConfirmTitle', {
        name: repo.name,
        defaultValue: `移除「${repo.name}」？`
      }),
      content: t('sidebar.removeConfirmContent', {
        defaultValue: '只会从 GitFeed 中移除，不会删除磁盘上的本地仓库。'
      }),
      okText: t('common.remove', { defaultValue: '移除' }),
      cancelText: t('common.cancel', { defaultValue: '取消' }),
      okButtonProps: { danger: true },
      onOk: () => {
        removeRepository(repo.id)
        const currentRepoId = decodedPathname.startsWith('/project/')
          ? decodedPathname.slice('/project/'.length)
          : ''
        if (currentRepoId === repo.id) {
          void navigate({ to: '/' })
        }
      }
    })
  }

  // 主导航项
  const topMenuItems: MenuProps['items'] = [
    {
      key: 'welcome',
      icon: <LayoutGrid size={16} />,
      label: t('nav.overview', { defaultValue: '项目概览' })
    },
    {
      key: 'weekly-report',
      icon: <FileText size={16} />,
      label: t('nav.weeklyReport', { defaultValue: '全仓周报整理' })
    }
  ]

  // 本地工程列表项
  const repoMenuItems: MenuProps['items'] = repositories.map((repo) => ({
    key: `repo-${repo.id}`,
    icon: (
      <FolderGit2
        size={15}
        className={
          repo.status === 'available' ? 'text-[var(--ant-color-primary)]' : 'text-gray-400'
        }
      />
    ),
    label: (
      <div className="flex items-center justify-between group/repo w-full min-w-0 pr-0.5">
        <span className="truncate flex-1 min-w-0" title={repo.name}>
          {repo.name}
        </span>
        <Dropdown
          menu={{
            items: [
              {
                key: 'edit',
                icon: <Pencil size={13} />,
                label: t('common.edit', { defaultValue: '编辑工程' }),
                onClick: (info) => {
                  info.domEvent.stopPropagation()
                  setEditingRepo(repo)
                }
              },
              {
                type: 'divider'
              },
              {
                key: 'remove',
                icon: <Trash2 size={13} />,
                danger: true,
                label: t('common.remove', { defaultValue: '移除工程' }),
                onClick: (info) => {
                  info.domEvent.stopPropagation()
                  handleRemoveRepo(repo)
                }
              }
            ]
          }}
          trigger={['click']}
        >
          <Button
            type="text"
            size="small"
            icon={<MoreHorizontal size={14} />}
            title={t('common.more', { defaultValue: '更多操作' })}
            onClick={(e) => e.stopPropagation()}
            className="opacity-0 group-hover/repo:opacity-100 transition-opacity !h-6 !w-6 p-0 shrink-0 ml-1"
          />
        </Dropdown>
      </div>
    )
  }))

  const settingsMenuItems: MenuProps['items'] = [
    {
      key: 'settings',
      icon: <Settings size={16} />,
      label: t('nav.settings', { defaultValue: '设置' })
    }
  ]

  return (
    <Layout className="h-screen w-screen overflow-hidden bg-[var(--ant-color-bg-layout)] flex flex-row">
      {/* 经典左侧侧边栏 */}
      <Sider
        width={230}
        trigger={null}
        theme={isDark ? 'dark' : 'light'}
        style={{ background: 'var(--ant-color-bg-container)' }}
        className="!border-r !border-[var(--ant-color-border-secondary)] flex flex-col justify-between select-none h-full shrink-0"
      >
        <div className="flex flex-col h-full justify-between">
          {/* 顶部区域：Logo + 主导航 + 本地工程列表 */}
          <div className="flex-1 overflow-y-auto overflow-x-hidden">
            {/* 顶部 Logo 与拖拽区 */}
            <div
              className={`flex items-center gap-2.5 px-4 pb-3 ${isMac ? 'pt-8' : 'pt-4'}`}
              style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
            >
              <div
                className="flex h-7 w-7 items-center justify-center rounded-md bg-[var(--ant-color-primary)] text-white font-bold text-sm shadow-xs select-none"
                style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
              >
                GF
              </div>
              <div
                className="flex flex-col select-none"
                style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
              >
                <Typography.Text strong className="text-base tracking-tight leading-tight">
                  GitFeed
                </Typography.Text>
                <span className="text-[10px] text-[var(--ant-color-text-quaternary)] tracking-wide font-sans">
                  WEEKLY REPORT
                </span>
              </div>
            </div>

            {/* 主入口菜单（项目概览 / 全仓周报整理） */}
            <div className="px-2 pt-1">
              <Menu
                mode="inline"
                selectedKeys={[selectedMenuKey]}
                items={topMenuItems}
                onClick={({ key }) => {
                  if (key === 'welcome') void navigate({ to: '/' })
                  else if (key === 'weekly-report') void navigate({ to: '/weekly-report' })
                }}
                className="!border-r-0 font-medium"
              />
            </div>

            {/* 本地工程列表小标题 */}
            <div className="px-4 pt-5 pb-1 flex items-center justify-between">
              <span className="text-[11px] font-semibold tracking-wider text-[var(--ant-color-text-tertiary)] uppercase">
                {t('sidebar.title', { defaultValue: '本地工程' })}
              </span>
              <Tooltip title={t('sidebar.addBtn', { defaultValue: '添加工程' })}>
                <Button
                  type="text"
                  size="small"
                  icon={<Plus size={13} />}
                  loading={adding}
                  onClick={addRepository}
                  className="!h-5 !w-5 text-[var(--ant-color-text-tertiary)] hover:text-[var(--ant-color-primary)] p-0"
                />
              </Tooltip>
            </div>

            {/* 本地工程菜单 */}
            <div className="px-2">
              {repositories.length === 0 ? (
                <div
                  className="px-3 py-2 text-xs text-[var(--ant-color-text-quaternary)] cursor-pointer hover:text-[var(--ant-color-primary)] transition-colors"
                  onClick={addRepository}
                >
                  {t('welcome.clickToAddRepo', { defaultValue: '+ 点击添加本地工程' })}
                </div>
              ) : (
                <Menu
                  mode="inline"
                  selectedKeys={[selectedMenuKey]}
                  items={repoMenuItems}
                  onClick={({ key }) => {
                    const repoId = String(key).replace('repo-', '')
                    void navigate({ to: '/project/$repoId', params: { repoId } })
                  }}
                  className="!border-r-0 font-medium"
                />
              )}
            </div>
          </div>

          {/* 左下角设置入口 */}
          <div className="border-t border-[var(--ant-color-border-secondary)] p-2 shrink-0">
            <Menu
              mode="inline"
              selectedKeys={[selectedMenuKey === 'settings' ? 'settings' : '']}
              items={settingsMenuItems}
              onClick={() => void navigate({ to: '/settings' })}
              className="!border-r-0 font-medium"
            />
          </div>
        </div>
      </Sider>

      {/* 右侧主工作区：通过 TanStack Router Outlet 挂载 */}
      <Content className="min-w-0 flex-1 overflow-hidden h-full">
        <Outlet />
      </Content>

      {/* 本地工程编辑配置弹窗 */}
      <EditRepoModal
        open={Boolean(editingRepo)}
        onClose={() => setEditingRepo(null)}
        repo={editingRepo}
      />
    </Layout>
  )
}

// 根路由
const rootRoute = createRootRoute({
  component: RootLayout
})

// 首页路由（项目概览）
const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  component: function IndexComponent() {
    const navigate = useNavigate()
    return (
      <WelcomePage
        onSelectProject={(repoId) => void navigate({ to: '/project/$repoId', params: { repoId } })}
        onNavigateToWeeklyReport={() => void navigate({ to: '/weekly-report' })}
      />
    )
  }
})

// 单工程详情路由
const projectRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/project/$repoId',
  component: function ProjectComponent() {
    const { repoId } = useParams({ from: '/project/$repoId' })
    const navigate = useNavigate()
    return (
      <ThisWeekPage
        key={repoId}
        selectedRepoId={repoId}
        onBackToOverview={() => void navigate({ to: '/' })}
        onNavigateToSettings={() => void navigate({ to: '/settings' })}
      />
    )
  }
})

// 全仓周报汇总路由
const weeklyReportRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/weekly-report',
  component: function WeeklyReportComponent() {
    const navigate = useNavigate()
    return <WeeklyReportPage onNavigateToThisWeek={() => void navigate({ to: '/' })} />
  }
})

// 设置路由
const settingsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/settings',
  component: SettingsPage
})

// 构建路由树并创建基于 HashHistory 的桌面路由实例
const routeTree = rootRoute.addChildren([
  indexRoute,
  projectRoute,
  weeklyReportRoute,
  settingsRoute
])

const hashHistory = createHashHistory()

const router = createRouter({
  routeTree,
  history: hashHistory
})

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}

export function AppRouter(): React.JSX.Element {
  return <RouterProvider router={router} />
}
