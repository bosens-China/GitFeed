import { Card, Radio, Space } from 'antd'
import { Monitor, Moon, Settings, Sun } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useLocalStorageState } from 'ahooks'
import { useTheme } from '@renderer/theme/context'
import type { ThemeMode } from '@renderer/theme/types'

export function GeneralPreferencesCard(): React.JSX.Element {
  const { t, i18n } = useTranslation()
  const { mode, setMode } = useTheme()

  const [langPref, setLangPref] = useLocalStorageState<string>('gitfeed-language', {
    defaultValue: 'system'
  })

  const handleLangChange = (val: string): void => {
    setLangPref(val)
    if (val === 'system') {
      const sysLang = navigator.language.toLowerCase()
      void i18n.changeLanguage(sysLang.startsWith('zh') ? 'zh' : 'en')
    } else {
      void i18n.changeLanguage(val)
    }
  }

  return (
    <Card
      title={
        <Space size={8}>
          <Settings size={18} className="text-[var(--ant-color-primary)]" />
          <span>{t('settings.generalPreferences', { defaultValue: '通用偏好' })}</span>
        </Space>
      }
    >
      <div className="flex flex-col gap-6">
        {/* 外观设置 */}
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="text-sm font-medium text-[var(--ant-color-text)]">
              {t('settings.appearance', { defaultValue: '外观主题' })}
            </div>
            <div className="text-xs text-[var(--ant-color-text-secondary)]">
              {t('settings.appearanceDesc', { defaultValue: '支持标准默认浅色与深色模式切换' })}
            </div>
          </div>
          <Radio.Group
            optionType="button"
            buttonStyle="solid"
            value={mode}
            onChange={(e) => setMode(e.target.value as ThemeMode)}
            options={[
              {
                label: (
                  <Space size={4}>
                    <Monitor size={14} />
                    <span>{t('settings.system', { defaultValue: '跟随系统' })}</span>
                  </Space>
                ),
                value: 'system'
              },
              {
                label: (
                  <Space size={4}>
                    <Sun size={14} />
                    <span>{t('settings.light', { defaultValue: '浅色' })}</span>
                  </Space>
                ),
                value: 'light'
              },
              {
                label: (
                  <Space size={4}>
                    <Moon size={14} />
                    <span>{t('settings.dark', { defaultValue: '深色' })}</span>
                  </Space>
                ),
                value: 'dark'
              }
            ]}
          />
        </div>

        {/* 语言设置 */}
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-t border-[var(--ant-color-border-secondary)] pt-4">
          <div>
            <div className="text-sm font-medium text-[var(--ant-color-text)]">
              {t('settings.language', { defaultValue: '界面语言' })}
            </div>
            <div className="text-xs text-[var(--ant-color-text-secondary)]">
              {t('settings.languageDesc', { defaultValue: '选择您习惯的语言界面' })}
            </div>
          </div>
          <Radio.Group
            optionType="button"
            buttonStyle="solid"
            value={langPref}
            onChange={(e) => handleLangChange(e.target.value)}
            options={[
              { label: t('settings.langSystem', { defaultValue: '系统默认' }), value: 'system' },
              { label: '简体中文', value: 'zh' },
              { label: 'English', value: 'en' }
            ]}
          />
        </div>
      </div>
    </Card>
  )
}
