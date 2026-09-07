import { computeStats } from '@shared/commit-utils'
import {
  authorKey,
  matchesAnyIdentity,
  type AuthorIdentity,
  type CommitItem,
  type MultiRepoWeeklyQueryResult,
  type RepoQueryResult,
  type RepositoryBranchOverride,
  type RepositoryRecord,
  type RepositoryStatus,
  type TimeRangeState
} from '@shared/models'
import { resolveTimeRange } from '@shared/time-range'
import { listCommitsInRange } from './commits'
import { runGit } from './run'
import {
  assertGitRepository,
  getHeadState,
  listLocalBranches,
  pathExists,
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

export async function queryMultiRepoCommits(options: {
  repos: RepositoryRecord[]
  myIdentities: AuthorIdentity[]
  timeRangeState: TimeRangeState
  includeMerge: boolean
  branchOverride?: RepositoryBranchOverride
  repoId?: string
}): Promise<MultiRepoWeeklyQueryResult> {
  const { repos, myIdentities, timeRangeState, includeMerge, branchOverride, repoId } = options
  const timeRange = resolveTimeRange(timeRangeState)
  const endExclusive = timeRangeState.preset !== 'custom'
  const rangeEnd = endExclusive ? new Date(timeRange.end.getTime() - 1) : timeRange.end

  const repoResults: RepoQueryResult[] = []
  const allCommitsMap = new Map<string, CommitItem>()

  for (const repo of repos) {
    if (repoId ? repo.id !== repoId : !repo.enabledForReport) {
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

      for (const commit of filteredCommits) {
        allCommitsMap.set(`${repo.id}\u0000${commit.hash}`, commit)
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
    summaryStats: computeStats(allCommits)
  }
}
