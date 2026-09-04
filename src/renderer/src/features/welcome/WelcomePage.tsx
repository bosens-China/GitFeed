import { Badge, Button, Card, Col, Row, Space, Switch, Tag, Tooltip, Typography } from 'antd'
import { ArrowRight, FileText, FolderGit2, FolderPlus, GitBranch, Plus } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import type { RepositoryStatus } from '@shared/models'
import { useWorkbench } from '@renderer/hooks/useWorkbench'

interface WelcomePageProps {
  onSelectProject: (repoId: string) => void
  onNavigateToWeeklyReport: () => void
}

export function WelcomePage({
  onSelectProject,
  onNavigateToWeeklyReport
}: WelcomePageProps): React.JSX.Element {
  const { t } = useTranslation()
  const { state: workbench, addRepository, updateRepo, adding } = useWorkbench()

  const repositories = workbench?.repositories ?? []

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
          <Badge status="processing" text={t('settings.statusUnknown', { defaultValue: '就绪' })} />
        )
    }
  }

  // 1. 无工程时的引导欢迎页
  if (repositories.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center p-6 md:p-12 overflow-auto bg-[var(--ant-color-bg-layout)]">
        <div className="max-w-xl text-center flex flex-col items-center gap-6">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[var(--ant-color-primary)] text-white shadow-md">
            <FolderGit2 size={32} />
          </div>

          <div>
            <Typography.Title level={2} className="!mb-2">
              {t('welcome.title', { defaultValue: '欢迎使用 GitFeed' })}
            </Typography.Title>
            <Typography.Paragraph className="text-[var(--ant-color-text-secondary)] text-sm md:text-base leading-relaxed">
              {t('welcome.subtitle', {
                defaultValue:
                  '本地个人周报整理工具。跨工程聚合 Git 提交，并自动生成分类清晰的 Markdown 周报。'
              })}
            </Typography.Paragraph>
          </div>

          <Button
            type="primary"
            size="large"
            icon={<FolderPlus size={18} />}
            loading={adding}
            onClick={addRepository}
            className="h-11 px-8 text-base shadow-xs"
          >
            {t('welcome.addFirstRepo', { defaultValue: '添加第一个本地工程' })}
          </Button>

          {/* 3步核心流程说明卡片 */}
          <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4 w-full text-left">
            <Card
              size="small"
              variant="outlined"
              className="shadow-xs bg-[var(--ant-color-bg-container)]"
            >
              <div className="flex items-center gap-2 mb-1.5 font-semibold text-xs text-[var(--ant-color-primary)]">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[var(--ant-color-primary)] text-white text-[11px]">
                  1
                </span>
                <span>{t('welcome.step1Title', { defaultValue: '添加本地仓库' })}</span>
              </div>
              <p className="text-xs text-[var(--ant-color-text-secondary)] m-0">
                {t('welcome.step1Desc', {
                  defaultValue: '选择本地 Git 仓库目录，自动检测可用性。'
                })}
              </p>
            </Card>

            <Card
              size="small"
              variant="outlined"
              className="shadow-xs bg-[var(--ant-color-bg-container)]"
            >
              <div className="flex items-center gap-2 mb-1.5 font-semibold text-xs text-[var(--ant-color-primary)]">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[var(--ant-color-primary)] text-white text-[11px]">
                  2
                </span>
                <span>{t('welcome.step2Title', { defaultValue: '筛选提交记录' })}</span>
              </div>
              <p className="text-xs text-[var(--ant-color-text-secondary)] m-0">
                {t('welcome.step2Desc', {
                  defaultValue: '按时间、作者、仓库和分支聚合需要纳入周报的提交。'
                })}
              </p>
            </Card>

            <Card
              size="small"
              variant="outlined"
              className="shadow-xs bg-[var(--ant-color-bg-container)]"
            >
              <div className="flex items-center gap-2 mb-1.5 font-semibold text-xs text-[var(--ant-color-primary)]">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[var(--ant-color-primary)] text-white text-[11px]">
                  3
                </span>
                <span>{t('welcome.step3Title', { defaultValue: '一键导出周报' })}</span>
              </div>
              <p className="text-xs text-[var(--ant-color-text-secondary)] m-0">
                {t('welcome.step3Desc', {
                  defaultValue: '分赛道管理与实时预览，复制 Markdown 直接交付。'
                })}
              </p>
            </Card>
          </div>
        </div>
      </div>
    )
  }

  // 2. 已有工程时的项目选择引导工作台
  return (
    <div className="h-full overflow-auto p-6 md:p-8 bg-[var(--ant-color-bg-layout)]">
      <div className="mx-auto max-w-5xl flex flex-col gap-6">
        {/* 顶部标题区 */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-[var(--ant-color-border-secondary)] pb-4">
          <div>
            <Typography.Title level={4} className="!mb-1">
              {t('welcome.projectsTitle', { defaultValue: '我的本地工程' })}
            </Typography.Title>
            <Typography.Text type="secondary" className="text-xs">
              {t('welcome.projectsSubtitle', {
                defaultValue: '点击任意项目进入对应的提交可视化看板与事项提炼，或直接整理本周周报。'
              })}
            </Typography.Text>
          </div>

          <Space size="middle">
            <Button icon={<FileText size={15} />} onClick={onNavigateToWeeklyReport}>
              {t('nav.weeklyReport', { defaultValue: '周报整理' })}
            </Button>
            <Button
              type="primary"
              icon={<Plus size={15} />}
              loading={adding}
              onClick={addRepository}
            >
              {t('sidebar.addBtn', { defaultValue: '添加仓库' })}
            </Button>
          </Space>
        </div>

        {/* 项目卡片列表 */}
        <Row gutter={[16, 16]}>
          {repositories.map((repo) => (
            <Col xs={24} sm={12} lg={8} key={repo.id}>
              <Card
                hoverable
                variant="outlined"
                className="group flex h-full flex-col justify-between shadow-xs bg-[var(--ant-color-bg-container)] transition-all hover:border-[var(--ant-color-primary)]"
                onClick={() => onSelectProject(repo.id)}
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <FolderGit2 size={18} className="text-[var(--ant-color-primary)] shrink-0" />
                      <span className="font-semibold text-sm text-[var(--ant-color-text)] truncate">
                        {repo.name}
                      </span>
                    </div>
                    {renderStatusBadge(repo.status, repo.errorMessage)}
                  </div>

                  <Tooltip title={repo.path}>
                    <p className="font-mono text-[11px] text-[var(--ant-color-text-tertiary)] truncate mb-3">
                      {repo.path}
                    </p>
                  </Tooltip>

                  <div className="flex items-center gap-2 mb-3">
                    <Tag className="m-0 flex items-center gap-1 font-mono text-xs">
                      <GitBranch size={12} />
                      {repo.selectedBranches?.length
                        ? repo.selectedBranches.join(', ')
                        : repo.filters.branch || 'main'}
                    </Tag>
                  </div>
                </div>

                <div
                  className="flex items-center justify-between border-t border-[var(--ant-color-border-secondary)] pt-3 text-xs"
                  onClick={(e) => e.stopPropagation()}
                >
                  <Space size={6}>
                    <span className="text-[var(--ant-color-text-secondary)]">
                      {t('settings.participateReport', { defaultValue: '参与周报' })}
                    </span>
                    <Switch
                      size="small"
                      checked={repo.enabledForReport}
                      onChange={(checked) =>
                        void updateRepo(repo.id, { enabledForReport: checked })
                      }
                    />
                  </Space>

                  <div
                    className="flex items-center gap-1 font-medium text-[var(--ant-color-primary)] opacity-80 group-hover:opacity-100 cursor-pointer"
                    onClick={() => onSelectProject(repo.id)}
                  >
                    <span>{t('welcome.enterProject', { defaultValue: '进入分析' })}</span>
                    <ArrowRight
                      size={13}
                      className="transition-transform group-hover:translate-x-0.5"
                    />
                  </div>
                </div>
              </Card>
            </Col>
          ))}

          {/* 添加更多工程卡片 */}
          <Col xs={24} sm={12} lg={8}>
            <div
              onClick={addRepository}
              className="flex h-full min-h-[160px] cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-[var(--ant-color-border-secondary)] bg-[var(--ant-color-bg-container)] p-6 text-center transition-colors hover:border-[var(--ant-color-primary)] hover:bg-[var(--ant-color-fill-quaternary)]"
            >
              <Plus size={24} className="text-[var(--ant-color-text-tertiary)] mb-2" />
              <span className="text-sm font-medium text-[var(--ant-color-text-secondary)]">
                {t('welcome.addMoreProjects', { defaultValue: '添加更多本地工程' })}
              </span>
            </div>
          </Col>
        </Row>
      </div>
    </div>
  )
}
