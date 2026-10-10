import { Switch, Tag, Tooltip } from 'antd'
import { useTranslation } from 'react-i18next'

interface WorkdayFilterControlProps {
  checked: boolean
  hiddenCount: number
  onChange: (checked: boolean) => void
}

export function WorkdayFilterControl({
  checked,
  hiddenCount,
  onChange
}: WorkdayFilterControlProps): React.JSX.Element {
  const { t } = useTranslation()
  return (
    <div className="flex min-h-8 shrink-0 items-center gap-1.5">
      <Tooltip title={t('filterBar.workdaysHint')}>
        <span className="inline-flex items-center gap-1.5 whitespace-nowrap text-xs">
          <Switch
            size="small"
            checked={checked}
            onChange={onChange}
            aria-label={t('filterBar.onlyWorkdays')}
          />
          {t('filterBar.onlyWorkdays')}
        </span>
      </Tooltip>
      {checked && hiddenCount > 0 && (
        <Tag color="orange" bordered={false} className="m-0 text-[11px]">
          {t('filterBar.hiddenRestCommits', { count: hiddenCount })}
        </Tag>
      )}
    </div>
  )
}
