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

export type ProjectViewTab = 'report' | 'changes'

/** 单工程分析页中需要跨会话恢复的稳定视图状态。 */
export interface ProjectViewMemory {
  timeRange: TimeRangeState
  selectedAuthorKeys: string[]
  searchKeyword: string
  activeTabKey: ProjectViewTab
  analysisBranch: string | null
}

export type RepositoryStatus = 'available' | 'empty' | 'missing' | 'not_git' | 'error'

export interface RepositoryRecord {
  /** 规范化绝对路径 */
  id: string
  path: string
  name: string
  enabledForReport: boolean
  selectedBranches: string[]
  /** 最近一次检测到的本地分支，用于设置页安全选择 */
  availableBranches?: string[]
  status?: RepositoryStatus
  lastCheckedAt?: string
  errorMessage?: string
  viewMemory?: ProjectViewMemory
}

/** 仅用于当前查询的临时分支，不会写入工程配置。 */
export interface RepositoryBranchOverride {
  repoId: string
  branch: string
}

export type RepositoryUpdate = Partial<
  Pick<RepositoryRecord, 'name' | 'enabledForReport' | 'selectedBranches'>
>

export interface WorkbenchState {
  version: 3
  repositories: RepositoryRecord[]
  activeRepositoryId: string | null
  myIdentities: AuthorIdentity[]
  includeMergeDefault: boolean
}

export interface CommitDiffResult {
  patch: string
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
  /** 本次查询的分支范围，不表示提交仅属于其中某个分支。 */
  branch: string
  repoId?: string
  repoName?: string
  files: FileChange[]
}

export interface CommitStats {
  commitCount: number
  additions: number
  deletions: number
  changedFiles: number
}

export interface ActivityStats extends CommitStats {
  activeRepoCount: number
  activeDayCount: number
}

export interface ResolvedTimeRange {
  start: Date
  end: Date
  label: string
  timezone: string
}

export interface RepoQueryResult {
  repoId: string
  repoName: string
  repoPath: string
  status: RepositoryStatus
  branches: string[]
  resolvedBranches: string[]
  branchWarning?: string
  commits: CommitItem[]
  stats: CommitStats
  error?: string
}

export interface MultiRepoWeeklyQueryResult {
  ok: boolean
  timeRange: ResolvedTimeRange
  repos: RepoQueryResult[]
  allCommits: CommitItem[]
  summaryStats: ActivityStats
  error?: string
}

export function authorKey(author: AuthorIdentity): string {
  return `${author.name.trim()}\u0000${author.email.trim().toLowerCase()}`
}

export function sameAuthor(a: AuthorIdentity, b: AuthorIdentity): boolean {
  return (
    a.name.trim().toLowerCase() === b.name.trim().toLowerCase() &&
    a.email.trim().toLowerCase() === b.email.trim().toLowerCase()
  )
}

export function matchesIdentity(author: AuthorIdentity, identity: AuthorIdentity): boolean {
  if (author.email && identity.email) {
    return author.email.trim().toLowerCase() === identity.email.trim().toLowerCase()
  }
  return author.name.trim().toLowerCase() === identity.name.trim().toLowerCase()
}

export function matchesAnyIdentity(author: AuthorIdentity, identities: AuthorIdentity[]): boolean {
  if (identities.length === 0) return true
  return identities.some((identity) => matchesIdentity(author, identity))
}

/** 空数组在作者筛选中表示“全部”，也用于没有全局身份或没有可匹配作者时的回退。 */
export function defaultSelectedAuthorKeys(
  availableAuthors: AuthorIdentity[],
  globalIdentities: AuthorIdentity[]
): string[] {
  if (globalIdentities.length === 0) return []
  return availableAuthors
    .filter((author) => matchesAnyIdentity(author, globalIdentities))
    .map(authorKey)
}
