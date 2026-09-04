import type { GitFeedApi } from './index'

declare global {
  interface Window {
    api: GitFeedApi
  }
}

export {}
