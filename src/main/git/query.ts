import {
  collectAuthors,
  computeStats,
  filterCommitsByAuthors,
  reconcileAuthorsFilter
} from '@shared/commit-utils'
import {
  authorKey,
  matchesAnyIdentity,
  type AuthorIdentity,
  type CommitItem,
  type MultiRepoWeeklyQueryResult,
  type RepoQueryResult,
  type RepositoryFilters,
  type RepositoryBranchOverride,
  type RepositoryQueryResult,
  type RepositoryRecord,
  type RepositoryStatus,
  type TimeRangeState
} from '@shared/models'
import { localDateKey, resolveTimeRange } from '@shared/time-range'
import { listCommitsInRange } from './commits'
import { GitCommandError, runGit } from './run'
import {
  assertGitRepository,
  getHeadState,
  listLocalBranches,
  pathExists,
  repositoryDisplayName,
  resolveBranchFallback
} from './repository'

export async function diagnoseRepository(repoPath: string): Promise<{
  status: RepositoryStatus
  branches: string[]
  headBranch: string | null
  error?: string
}> {
  try {
    if (!(await pathExists(repoPath))) {
      return {
        status: 'missing',
        branches: [],
        headBranch: null,
        error: '仓库路径不存在或不可访问'
      }
    }

    try {
      await assertGitRepository(repoPath)
    } catch {
      return {
        status: 'not_git',
        branches: [],
        headBranch: null,
        error: '所选路径不是有效 Git 仓库'
      }
    }

    const branches = await listLocalBranches(repoPath)
    const head = await getHeadState(repoPath)

    if (branches.length === 0) {
      return {
        status: 'empty',
        branches: [],
        headBranch: head.branch
      }
    }

    return {
      status: 'available',
      branches,
      headBranch: head.branch
    }
  } catch (err) {
    return {
      status: 'error',
      branches: [],
      headBranch: null,
      error: err instanceof Error ? err.message : '检测失败'
    }
  }
}

export async function discoverRepoAuthors(repoPath: string): Promise<AuthorIdentity[]> {
  try {
    const { stdout } = await runGit(repoPath, [
      '-c',
      'core.quotepath=false',
      'log',
      '--pretty=format:%an\u001f%ae',
      '--all',
      '-n',
      '300'
    ])

    const seen = new Set<string>()
    const authors: AuthorIdentity[] = []

    for (const line of stdout.split('\n')) {
      const trimmed = line.trim()
      if (!trimmed) continue
      const [name, email] = trimmed.split('\u001f')
      if (!name || !email) continue
      const author: AuthorIdentity = { name: name.trim(), email: email.trim() }
      const key = authorKey(author)
      if (!seen.has(key)) {
        seen.add(key)
        authors.push(author)
      }
    }

    return authors.sort((a, b) => a.name.localeCompare(b.name))
  } catch {
    return []
  }
}

export async function queryRepository(
  repoPath: string,
  filters: RepositoryFilters
): Promise<RepositoryQueryResult> {
  try {
    if (!(await pathExists(repoPath))) {
      return {
        ok: false,
        code: 'PATH_MISSING',
        error: '仓库路径不存在或不可访问'
      }
    }

    let timeRange
    try {
      timeRange = resolveTimeRange(filters.timeRange)
    } catch (error) {
      return {
        ok: false,
        code: 'INVALID_RANGE',
        error: error instanceof Error ? error.message : '时间范围无效'
      }
    }

    const branches = await listLocalBranches(repoPath)
    const head = await getHeadState(repoPath)
    const { branch, warning } = resolveBranchFallback(
      filters.branch,
      branches,
      head.branch,
      head.detached
    )

    if (!branch) {
      return {
        ok: true,
        path: repoPath,
        name: repositoryDisplayName(repoPath),
        branches,
        headBranch: head.branch,
        headDetached: head.detached,
        resolvedBranch: null,
        branchWarning: warning,
        authors: [],
        authorsFilter: { mode: 'selected', authors: [] },
        commits: [],
        stats: { commitCount: 0, additions: 0, deletions: 0, changedFiles: 0 },
        timeRange,
        includeMerge: filters.includeMerge
      }
    }

    // 快捷范围左闭右开：用 end-1ms；自定义为闭区间含结束日 23:59:59.999
    const endExclusive = filters.timeRange.preset !== 'custom'
    const rangeEnd = endExclusive ? new Date(timeRange.end.getTime() - 1) : timeRange.end

    const allInRange = await listCommitsInRange({
      repoPath,
      branch,
      start: timeRange.start,
      end: rangeEnd,
      includeMerge: filters.includeMerge
    })

    const authors = collectAuthors(allInRange)
    const authorsFilter = reconcileAuthorsFilter(filters.authors, authors)

    const commits = filterCommitsByAuthors(allInRange, authorsFilter)
    const stats = computeStats(commits)

    return {
      ok: true,
      path: repoPath,
      name: repositoryDisplayName(repoPath),
      branches,
      headBranch: head.branch,
      headDetached: head.detached,
      resolvedBranch: branch,
      branchWarning: warning,
      authors,
      authorsFilter,
      commits,
      stats,
      timeRange,
      includeMerge: filters.includeMerge
    }
  } catch (error) {
    if (error instanceof GitCommandError) {
      return {
        ok: false,
        code: error.code === 'NO_GIT_BINARY' ? 'NO_GIT_BINARY' : 'GIT_ERROR',
        error: error.message
      }
    }
    return {
      ok: false,
      code: 'UNKNOWN',
      error: error instanceof Error ? error.message : '查询失败'
    }
  }
}

export async function queryMultiRepoCommits(options: {
  repos: RepositoryRecord[]
  myIdentities: AuthorIdentity[]
  timeRangeState: TimeRangeState
  includeMerge: boolean
  branchOverride?: RepositoryBranchOverride
}): Promise<MultiRepoWeeklyQueryResult> {
  const { repos, myIdentities, timeRangeState, includeMerge, branchOverride } = options
  const timeRange = resolveTimeRange(timeRangeState)
  const endExclusive = timeRangeState.preset !== 'custom'
  const rangeEnd = endExclusive ? new Date(timeRange.end.getTime() - 1) : timeRange.end

  const repoResults: RepoQueryResult[] = []
  const allCommitsMap = new Map<string, CommitItem>()
  const activeRepoIds = new Set<string>()
  const activeDays = new Set<string>()
  const changedFilePaths = new Set<string>()
  let totalAdditions = 0
  let totalDeletions = 0

  for (const repo of repos) {
    if (!repo.enabledForReport) {
      continue
    }

    const diagnosis = await diagnoseRepository(repo.path)
    if (diagnosis.status !== 'available') {
      repoResults.push({
        repoId: repo.id,
        repoName: repo.name,
        repoPath: repo.path,
        status: diagnosis.status,
        branches: diagnosis.branches,
        resolvedBranches: [],
        commits: [],
        stats: { commitCount: 0, additions: 0, deletions: 0, changedFiles: 0 },
        error: diagnosis.error
      })
      continue
    }

    // 临时选择只影响当前查询，Git 命令始终以分支名读取历史，不会切换工作区。
    let targetBranches: string[]
    if (branchOverride?.repoId === repo.id) {
      if (!diagnosis.branches.includes(branchOverride.branch)) {
        repoResults.push({
          repoId: repo.id,
          repoName: repo.name,
          repoPath: repo.path,
          status: 'available',
          branches: diagnosis.branches,
          resolvedBranches: [],
          commits: [],
          stats: { commitCount: 0, additions: 0, deletions: 0, changedFiles: 0 },
          error: '所选本地分支已不存在，请重新检测仓库。'
        })
        continue
      }
      targetBranches = [branchOverride.branch]
    } else {
      targetBranches = (repo.selectedBranches ?? []).filter((branch) =>
        diagnosis.branches.includes(branch)
      )
      if (targetBranches.length === 0) {
        const fallback = resolveBranchFallback(
          null,
          diagnosis.branches,
          diagnosis.headBranch,
          false
        )
        if (fallback.branch) {
          targetBranches = [fallback.branch]
        }
      }
    }

    if (targetBranches.length === 0) {
      repoResults.push({
        repoId: repo.id,
        repoName: repo.name,
        repoPath: repo.path,
        status: 'available',
        branches: diagnosis.branches,
        resolvedBranches: [],
        commits: [],
        stats: { commitCount: 0, additions: 0, deletions: 0, changedFiles: 0 }
      })
      continue
    }

    try {
      const rawCommits = await listCommitsInRange({
        repoPath: repo.path,
        branches: targetBranches,
        start: timeRange.start,
        end: rangeEnd,
        includeMerge,
        repoId: repo.id,
        repoName: repo.name
      })

      // 根据我的身份过滤
      const filteredCommits = rawCommits.filter((commit) =>
        matchesAnyIdentity({ name: commit.authorName, email: commit.authorEmail }, myIdentities)
      )

      const repoStats = computeStats(filteredCommits)

      if (filteredCommits.length > 0) {
        activeRepoIds.add(repo.id)
      }

      for (const commit of filteredCommits) {
        const commitKey = `${repo.id}\u0000${commit.hash}`
        if (!allCommitsMap.has(commitKey)) {
          allCommitsMap.set(commitKey, commit)

          activeDays.add(localDateKey(commit.authoredAt))

          for (const file of commit.files) {
            changedFilePaths.add(`${repo.id}\u0000${file.path}`)
            if (file.additions) totalAdditions += file.additions
            if (file.deletions) totalDeletions += file.deletions
          }
        }
      }

      repoResults.push({
        repoId: repo.id,
        repoName: repo.name,
        repoPath: repo.path,
        status: 'available',
        branches: diagnosis.branches,
        resolvedBranches: targetBranches,
        commits: filteredCommits,
        stats: repoStats
      })
    } catch (err) {
      repoResults.push({
        repoId: repo.id,
        repoName: repo.name,
        repoPath: repo.path,
        status: 'error',
        branches: diagnosis.branches,
        resolvedBranches: targetBranches,
        commits: [],
        stats: { commitCount: 0, additions: 0, deletions: 0, changedFiles: 0 },
        error: err instanceof Error ? err.message : '读取提交失败'
      })
    }
  }

  const allCommits = Array.from(allCommitsMap.values()).sort(
    (a, b) => new Date(b.authoredAt).getTime() - new Date(a.authoredAt).getTime()
  )

  return {
    ok: true,
    timeRange,
    repos: repoResults,
    allCommits,
    summaryStats: {
      commitCount: allCommits.length,
      activeRepoCount: activeRepoIds.size,
      activeDayCount: activeDays.size,
      additions: totalAdditions,
      deletions: totalDeletions,
      changedFiles: changedFilePaths.size
    }
  }
}
