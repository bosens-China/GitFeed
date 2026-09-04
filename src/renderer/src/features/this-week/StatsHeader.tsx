import { Card, Col, Row, Statistic } from 'antd'
import { Calendar, CheckCircle2, FileCode, FolderGit2, MinusSquare, PlusSquare } from 'lucide-react'
import { useTranslation } from 'react-i18next'

interface StatsHeaderProps {
  stats: {
    commitCount: number
    activeRepoCount?: number
    activeDayCount: number
    additions: number
    deletions: number
    changedFiles: number
  }
  showRepoCount?: boolean
}

export function StatsHeader({ stats, showRepoCount = true }: StatsHeaderProps): React.JSX.Element {
  const { t } = useTranslation()
  const colSpan = showRepoCount ? { xs: 12, sm: 8, md: 4 } : { xs: 12, sm: 8, md: 4, lg: 4 }

  return (
    <Row gutter={[12, 12]}>
      {/* 1. 提交次数 */}
      <Col {...colSpan}>
        <Card size="small">
          <Statistic
            title={
              <span className="flex items-center gap-1.5 text-xs">
                <CheckCircle2 size={14} className="text-[var(--ant-color-primary)]" />
                {t('stats.commits', { defaultValue: '提交次数' })}
              </span>
            }
            value={stats.commitCount}
            valueStyle={{ fontWeight: 600, fontSize: '1.25rem' }}
          />
        </Card>
      </Col>

      {/* 2. 活跃工程（仅全仓/多工程展示） */}
      {showRepoCount && (
        <Col {...colSpan}>
          <Card size="small">
            <Statistic
              title={
                <span className="flex items-center gap-1.5 text-xs">
                  <FolderGit2 size={14} className="text-[var(--ant-color-primary)]" />
                  {t('stats.activeRepos', { defaultValue: '活跃工程' })}
                </span>
              }
              value={stats.activeRepoCount ?? 0}
              valueStyle={{ fontWeight: 600, fontSize: '1.25rem' }}
            />
          </Card>
        </Col>
      )}

      {/* 3. 活跃天数 */}
      <Col {...colSpan}>
        <Card size="small">
          <Statistic
            title={
              <span className="flex items-center gap-1.5 text-xs">
                <Calendar size={14} className="text-[var(--ant-color-primary)]" />
                {t('stats.activeDays', { defaultValue: '活跃天数' })}
              </span>
            }
            value={stats.activeDayCount}
            valueStyle={{ fontWeight: 600, fontSize: '1.25rem' }}
          />
        </Card>
      </Col>

      {/* 4. 涉及文件 */}
      <Col {...colSpan}>
        <Card size="small">
          <Statistic
            title={
              <span className="flex items-center gap-1.5 text-xs">
                <FileCode size={14} className="text-sky-500" />
                {t('stats.filesChanged', { defaultValue: '涉及文件' })}
              </span>
            }
            value={stats.changedFiles}
            valueStyle={{ fontWeight: 600, fontSize: '1.25rem' }}
          />
        </Card>
      </Col>

      {/* 5. 代码新增 */}
      <Col {...colSpan}>
        <Card size="small">
          <Statistic
            title={
              <span className="flex items-center gap-1.5 text-xs">
                <PlusSquare size={14} className="text-emerald-500" />
                {t('stats.additions', { defaultValue: '代码新增' })}
              </span>
            }
            value={stats.additions}
            prefix="+"
            valueStyle={{ fontWeight: 600, fontSize: '1.25rem', color: '#10b981' }}
          />
        </Card>
      </Col>

      {/* 6. 代码删除 */}
      <Col {...colSpan}>
        <Card size="small">
          <Statistic
            title={
              <span className="flex items-center gap-1.5 text-xs">
                <MinusSquare size={14} className="text-rose-500" />
                {t('stats.deletions', { defaultValue: '代码删除' })}
              </span>
            }
            value={stats.deletions}
            prefix="-"
            valueStyle={{ fontWeight: 600, fontSize: '1.25rem', color: '#f43f5e' }}
          />
        </Card>
      </Col>
    </Row>
  )
}
