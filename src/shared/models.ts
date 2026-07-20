export type TimeRangePreset = 'thisWeek' | 'lastWeek' | 'thisMonth' | 'lastMonth' | 'custom'

export interface TimeRangeState {
  preset: TimeRangePreset
  /** ISO string，仅 custom 使用 */
  customStart?: string
  /** ISO string，仅 custom 使用 */
  customEnd?: string
}

export interface AuthorIdentity {
  name: string
  email: string
}

export type AuthorsFilter = { mode: 'all' } | { mode: 'selected'; authors: AuthorIdentity[] }

export interface RepositoryFilters {
  branch: string | null
  authors: AuthorsFilter
  timeRange: TimeRangeState
  includeMerge: boolean
}

export interface RepositoryRecord {
  /** 规范化绝对路径 */
  id: string
  path: string
  name: string
  filters: RepositoryFilters
}

export interface WorkbenchState {
  version: 1
  repositories: RepositoryRecord[]
  activeRepositoryId: string | null
}

export type FileChangeStatus = 'A' | 'M' | 'D' | 'R' | 'C' | 'T' | 'U' | '?'

export interface FileChange {
  path: string
  status: FileChangeStatus
  previousPath?: string
  additions: number | null
  deletions: number | null
  binary: boolean
}

export interface CommitItem {
  hash: string
  shortHash: string
  authorName: string
  authorEmail: string
  authoredAt: string
  message: string
  isMerge: boolean
  branch: string
  files: FileChange[]
}

export interface CommitStats {
  commitCount: number
  additions: number
  deletions: number
  changedFiles: number
}

export interface ResolvedTimeRange {
  start: Date
  end: Date
  label: string
  timezone: string
}

export type RepositoryQuerySuccess = {
  ok: true
  path: string
  name: string
  branches: string[]
  headBranch: string | null
  headDetached: boolean
  resolvedBranch: string | null
  branchWarning: string | null
  authors: AuthorIdentity[]
  authorsFilter: AuthorsFilter
  commits: CommitItem[]
  stats: CommitStats
  timeRange: ResolvedTimeRange
  includeMerge: boolean
}

export type RepositoryQueryFailure = {
  ok: false
  error: string
  code: 'NOT_GIT' | 'PATH_MISSING' | 'NO_GIT_BINARY' | 'GIT_ERROR' | 'INVALID_RANGE' | 'UNKNOWN'
}

export type RepositoryQueryResult = RepositoryQuerySuccess | RepositoryQueryFailure

export function createDefaultFilters(): RepositoryFilters {
  return {
    branch: null,
    authors: { mode: 'all' },
    timeRange: { preset: 'thisWeek' },
    includeMerge: false
  }
}

export function authorKey(author: AuthorIdentity): string {
  return `${author.name}\u0000${author.email}`
}

export function sameAuthor(a: AuthorIdentity, b: AuthorIdentity): boolean {
  return a.name === b.name && a.email === b.email
}
