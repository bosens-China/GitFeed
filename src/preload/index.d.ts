import { ElectronAPI } from '@electron-toolkit/preload'
import type { GitFeedApi } from './index'

declare global {
  interface Window {
    electron: ElectronAPI
    api: GitFeedApi
  }
}

export {}
