import { useState } from 'react'
import { Alert, App, Button, Card, Space, Tag, Typography } from 'antd'
import {
  CheckCircle2,
  ExternalLink,
  GitFork,
  Info,
  RefreshCw,
  Terminal,
  XCircle
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useGitStatus } from '@renderer/hooks/useWorkbench'
import type { UpdateCheckResult } from '@shared/update'

const GITHUB_PROJECT_URL = 'https://github.com/bosens-China/GitFeed'
const APP_VERSION = 'v1.0.0'

export function AboutAndDiagnosticsCard(): React.JSX.Element {
  const { t } = useTranslation()
  const { message } = App.useApp()
  const { status: gitStatus, isLoading: gitLoading, refetchStatus } = useGitStatus()

  const [isCheckingUpdate, setIsCheckingUpdate] = useState(false)
  const [updateResult, setUpdateResult] = useState<UpdateCheckResult | null>(null)

  const handleCheckForUpdates = async (): Promise<void> => {
    setIsCheckingUpdate(true)
    try {
      const result = await window.api.checkForUpdates()
      setUpdateResult(result)
      if (result.status === 'update-available') {
        message.info(t('settings.updateAvailable', { version: result.latestVersion }))
      } else if (result.status === 'up-to-date') {
        message.success(t('settings.upToDate', { version: result.currentVersion }))
      } else {
        message.info(t('settings.updateUnavailable'))
      }
    } catch {
      message.error(t('settings.updateCheckFailed'))
    } finally {
      setIsCheckingUpdate(false)
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {/* 1. GitFeed 软件版本与发布信息卡片 */}
      <Card
        title={
          <Space size={8}>
            <Info size={18} className="text-[var(--ant-color-primary)]" />
            <span>{t('settings.aboutAndDiagnostics', { defaultValue: '关于 GitFeed' })}</span>
          </Space>
        }
      >
        <div className="flex flex-col gap-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3.5">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--ant-color-primary)] text-white font-bold text-lg shadow-sm select-none">
                GF
              </div>
              <div className="flex flex-col">
                <Space size={8} align="center">
                  <Typography.Title level={5} className="!m-0">
                    GitFeed
                  </Typography.Title>
                  <Tag color="blue" bordered={false} className="font-mono text-xs m-0">
                    {APP_VERSION}
                  </Tag>
                </Space>
                <Typography.Text type="secondary" className="text-xs mt-0.5">
                  {t('settings.appSubtitle', {
                    defaultValue: '本地优先的跨工程 Git 周报与提交整理工具'
                  })}
                </Typography.Text>
              </div>
            </div>

            <Space wrap>
              <Button
                icon={<GitFork size={14} />}
                href={GITHUB_PROJECT_URL}
                target="_blank"
                rel="noreferrer"
              >
                {t('settings.openGitHub', { defaultValue: '打开 GitHub' })}
              </Button>
              <Button
                type="primary"
                icon={<RefreshCw size={14} className={isCheckingUpdate ? 'animate-spin' : ''} />}
                loading={isCheckingUpdate}
                onClick={() => void handleCheckForUpdates()}
              >
                {t('settings.checkForUpdates', { defaultValue: '检查更新' })}
              </Button>
            </Space>
          </div>

          {updateResult?.status === 'update-available' && (
            <Alert
              type="info"
              showIcon
              message={
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span>
                    {t('settings.updateAvailable', { version: updateResult.latestVersion })}
                  </span>
                  <Button
                    type="link"
                    size="small"
                    className="h-auto p-0"
                    href={updateResult.releaseUrl}
                    target="_blank"
                    rel="noreferrer"
                    icon={<ExternalLink size={13} />}
                  >
                    {t('settings.viewRelease', { defaultValue: '查看发布说明' })}
                  </Button>
                </div>
              }
            />
          )}
        </div>
      </Card>

      {/* 2. 系统本地 Git 运行环境诊断卡片 */}
      <Card
        title={
          <div className="flex items-center justify-between">
            <Space size={8}>
              <Terminal size={18} className="text-[var(--ant-color-primary)]" />
              <span>{t('settings.environmentTitle', { defaultValue: '系统 Git 环境诊断' })}</span>
            </Space>
            <Button
              icon={<RefreshCw size={14} className={gitLoading ? 'animate-spin' : ''} />}
              loading={gitLoading}
              onClick={() => refetchStatus()}
            >
              {t('filterBar.refresh', { defaultValue: '重新检测' })}
            </Button>
          </div>
        }
      >
        {gitStatus?.ok ? (
          <Alert
            type="success"
            showIcon
            icon={<CheckCircle2 size={16} />}
            message={
              <div className="flex items-center gap-2">
                <span className="font-semibold text-sm">
                  {t('settings.gitAvailable', { defaultValue: '本地 Git 环境就绪' })}
                </span>
                <Tag color="green" className="font-mono text-xs m-0">
                  {gitStatus.version}
                </Tag>
              </div>
            }
            description={
              <span className="text-xs text-[var(--ant-color-text-secondary)]">
                {t('settings.gitDescOk', {
                  defaultValue: 'Git 命令可正常调用，所有只读分析及多仓库提交检索功能运行正常。'
                })}
              </span>
            }
          />
        ) : (
          <Alert
            type="error"
            showIcon
            icon={<XCircle size={16} />}
            message={t('errors.NO_GIT_BINARY', {
              defaultValue: '未检测到系统 Git'
            })}
            description={
              <div className="text-xs space-y-2">
                <div>
                  {gitStatus?.error ||
                    t('settings.gitNotFoundDesc', {
                      defaultValue:
                        'GitFeed 需要系统已提供 Git 命令。应用只检测 Git 是否可用，不负责安装、升级或配置 Git。'
                    })}
                </div>
              </div>
            }
          />
        )}
      </Card>
    </div>
  )
}
