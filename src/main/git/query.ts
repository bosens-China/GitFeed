import {
  collectAuthors,
  computeStats,
  filterCommitsByAuthors,
  reconcileAuthorsFilter
} from '@shared/commit-utils'
import type { RepositoryFilters, RepositoryQueryResult } from '@shared/models'
import { resolveTimeRange } from '@shared/time-range'
import { listCommitsInRange } from './commits'
import { GitCommandError } from './run'
import {
  getHeadState,
  listLocalBranches,
  pathExists,
  repositoryDisplayName,
  resolveBranchFallback
} from './repository'

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
