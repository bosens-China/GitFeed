import type { UpdateCheckResult } from '@shared/update'

const LATEST_RELEASE_URL = 'https://api.github.com/repos/bosens-China/GitFeed/releases/latest'

interface LatestRelease {
  tag_name: string
  html_url: string
}

function parseVersion(value: string): { numbers: number[]; prerelease: boolean } | null {
  const match = /^v?(\d+)\.(\d+)\.(\d+)(?:-[-.0-9A-Za-z]+)?(?:\+[-.0-9A-Za-z]+)?$/.exec(value)
  if (!match) return null

  return {
    numbers: match.slice(1, 4).map(Number),
    prerelease: value.includes('-')
  }
}

export function isNewerVersion(latestVersion: string, currentVersion: string): boolean {
  const latest = parseVersion(latestVersion)
  const current = parseVersion(currentVersion)
  if (!latest || !current) return latestVersion !== currentVersion

  for (let index = 0; index < latest.numbers.length; index += 1) {
    if (latest.numbers[index] !== current.numbers[index]) {
      return latest.numbers[index] > current.numbers[index]
    }
  }
  return !latest.prerelease && current.prerelease
}

export function parseLatestRelease(value: unknown): LatestRelease {
  if (!value || typeof value !== 'object') {
    throw new Error('版本服务返回的数据无效')
  }

  const release = value as Record<string, unknown>
  if (typeof release.tag_name !== 'string' || typeof release.html_url !== 'string') {
    throw new Error('版本服务未返回发布版本')
  }

  try {
    const url = new URL(release.html_url)
    if (url.protocol !== 'https:' || url.hostname !== 'github.com') {
      throw new Error('发布页地址无效')
    }
  } catch {
    throw new Error('发布页地址无效')
  }

  return { tag_name: release.tag_name, html_url: release.html_url }
}

export async function checkForUpdates(currentVersion: string): Promise<UpdateCheckResult> {
  let response: Response
  try {
    response = await fetch(LATEST_RELEASE_URL, {
      headers: {
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28'
      },
      signal: AbortSignal.timeout(10_000)
    })
  } catch {
    throw new Error('无法连接 GitHub，请检查网络后重试')
  }

  if (response.status === 404) {
    return { status: 'unavailable', currentVersion }
  }
  if (!response.ok) {
    throw new Error(`版本检查失败（HTTP ${response.status}）`)
  }

  const release = parseLatestRelease(await response.json())
  const latestVersion = release.tag_name.replace(/^v/, '')
  if (isNewerVersion(latestVersion, currentVersion)) {
    return {
      status: 'update-available',
      currentVersion,
      latestVersion,
      releaseUrl: release.html_url
    }
  }

  return { status: 'up-to-date', currentVersion, latestVersion }
}
