import { useEffect, useSyncExternalStore, type ReactNode } from 'react'
import { useLocalStorageState } from 'ahooks'
import { ConfigProvider, App as AntdApp, theme as antdTheme } from 'antd'
import zhCN from 'antd/locale/zh_CN'
import enUS from 'antd/locale/en_US'
import { useTranslation } from 'react-i18next'
import { updateDayjsLocale } from '@renderer/i18n'
import { ThemeContext } from './context'
import { THEME_MODE_STORAGE_KEY, type ThemeMode } from './types'

function subscribePrefersDark(onStoreChange: () => void): () => void {
  const media = window.matchMedia('(prefers-color-scheme: dark)')
  media.addEventListener('change', onStoreChange)
  return () => media.removeEventListener('change', onStoreChange)
}

function getPrefersDarkSnapshot(): boolean {
  return window.matchMedia('(prefers-color-scheme: dark)').matches
}

function usePrefersDark(): boolean {
  return useSyncExternalStore(subscribePrefersDark, getPrefersDarkSnapshot, () => false)
}

interface ThemeProviderProps {
  children: ReactNode
}

export function ThemeProvider({ children }: ThemeProviderProps): React.JSX.Element {
  const [mode, setMode] = useLocalStorageState<ThemeMode>(THEME_MODE_STORAGE_KEY, {
    defaultValue: 'system'
  })
  const { i18n } = useTranslation()
  const prefersDark = usePrefersDark()
  const resolvedMode = mode ?? 'system'
  const isDark = resolvedMode === 'dark' || (resolvedMode === 'system' && prefersDark)

  useEffect(() => {
    const root = document.documentElement
    root.classList.toggle('dark', isDark)
    root.style.colorScheme = isDark ? 'dark' : 'light'
  }, [isDark])

  useEffect(() => {
    updateDayjsLocale(i18n.language)
  }, [i18n.language])

  const contextValue = {
    mode: resolvedMode,
    setMode: (next: ThemeMode) => setMode(next),
    isDark
  }

  return (
    <ThemeContext.Provider value={contextValue}>
      <ConfigProvider
        locale={i18n.language.startsWith('zh') ? zhCN : enUS}
        theme={{
          algorithm: isDark ? antdTheme.darkAlgorithm : antdTheme.defaultAlgorithm,
          token: {
            colorBgLayout: isDark ? '#141414' : '#fafafa'
          },
          cssVar: { key: 'gitfeed' },
          hashed: false
        }}
      >
        <AntdApp className="h-full min-h-screen bg-[var(--ant-color-bg-layout)] text-[var(--ant-color-text)]">
          {children}
        </AntdApp>
      </ConfigProvider>
    </ThemeContext.Provider>
  )
}
