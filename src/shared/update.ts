export type UpdateCheckResult =
  | {
      status: 'update-available'
      currentVersion: string
      latestVersion: string
      releaseUrl: string
    }
  | {
      status: 'up-to-date'
      currentVersion: string
      latestVersion: string
    }
  | {
      status: 'unavailable'
      currentVersion: string
    }
