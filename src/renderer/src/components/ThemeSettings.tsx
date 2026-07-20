import { Card, Radio, Space, Typography } from 'antd'
import { useTheme } from '@renderer/theme/context'
import type { ThemeMode } from '@renderer/theme/types'

const options: Array<{ label: string; value: ThemeMode }> = [
  { label: '跟随系统', value: 'system' },
  { label: '浅色', value: 'light' },
  { label: '深色', value: 'dark' }
]

export function ThemeSettings(): React.JSX.Element {
  const { mode, setMode, isDark } = useTheme()

  return (
    <Card title="外观" className="w-full">
      <Space orientation="vertical" size="middle" className="w-full">
        <div>
          <Typography.Text type="secondary">主题</Typography.Text>
          <div className="mt-2">
            <Radio.Group
              optionType="button"
              buttonStyle="solid"
              value={mode}
              options={options}
              onChange={(event) => setMode(event.target.value)}
            />
          </div>
        </div>
        <Typography.Text type="secondary">当前实际效果：{isDark ? '深色' : '浅色'}</Typography.Text>
      </Space>
    </Card>
  )
}
