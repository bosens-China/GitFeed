import { Card, Statistic } from 'antd'
import type { CommitStats } from '@shared/models'

interface StatsBarProps {
  stats: CommitStats
}

const items: Array<{
  key: string
  title: string
  value: (stats: CommitStats) => string | number
}> = [
  {
    key: 'commits',
    title: '提交次数',
    value: (stats) => stats.commitCount
  },
  {
    key: 'lines',
    title: '代码行',
    value: (stats) => `+${stats.additions} / -${stats.deletions}`
  },
  {
    key: 'files',
    title: '修改文件',
    value: (stats) => stats.changedFiles
  }
]

export function StatsBar({ stats }: StatsBarProps): React.JSX.Element {
  return (
    <div className="grid grid-cols-3 gap-3 px-4 pt-4">
      {items.map((item) => (
        <Card
          key={item.key}
          size="small"
          className="h-full !shadow-none"
          styles={{
            body: {
              height: '100%',
              padding: '12px 16px'
            }
          }}
        >
          <Statistic
            title={item.title}
            value={item.value(stats)}
            valueStyle={{ fontSize: 22, lineHeight: 1.2, fontVariantNumeric: 'tabular-nums' }}
          />
        </Card>
      ))}
    </div>
  )
}
