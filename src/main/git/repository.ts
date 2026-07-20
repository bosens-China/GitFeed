import path from 'node:path'
import fs from 'node:fs/promises'
import { resolveBranchFallback } from '@shared/branch'
import { GitCommandError, runGit, runGitLines } from './run'

export { resolveBranchFallback }

export async function normalizeRepoPath(inputPath: string): Promise<string> {
  const absolute = path.resolve(inputPath)
  return process.platform === 'win32' ? absolute : path.normalize(absolute)
}

export async function pathExists(repoPath: string): Promise<boolean> {
  try {
    await fs.access(repoPath)
    return true
  } catch {
    return false
  }
}

export async function assertGitRepository(repoPath: string): Promise<string> {
  if (!(await pathExists(repoPath))) {
    throw Object.assign(new Error('仓库路径不存在或不可访问'), { code: 'PATH_MISSING' as const })
  }

  try {
    const { stdout } = await runGit(repoPath, ['rev-parse', '--is-inside-work-tree'])
    if (stdout.trim() !== 'true') {
      throw Object.assign(new Error('所选目录不是有效的 Git 仓库'), { code: 'NOT_GIT' as const })
    }
  } catch (error) {
    if (error instanceof GitCommandError && error.code === 'NO_GIT_BINARY') {
      throw error
    }
    if ((error as { code?: string }).code === 'NOT_GIT') {
      throw error
    }
    throw Object.assign(new Error('所选目录不是有效的 Git 仓库'), { code: 'NOT_GIT' as const })
  }

  const { stdout: toplevel } = await runGit(repoPath, ['rev-parse', '--show-toplevel'])
  return normalizeRepoPath(toplevel.trim())
}

export async function listLocalBranches(repoPath: string): Promise<string[]> {
  const lines = await runGitLines(repoPath, [
    'for-each-ref',
    '--format=%(refname:short)',
    'refs/heads'
  ])
  return lines.filter(Boolean)
}

export async function getHeadState(
  repoPath: string
): Promise<{ detached: boolean; branch: string | null }> {
  const symbolic = await runGit(repoPath, ['symbolic-ref', '--quiet', '--short', 'HEAD'], {
    reject: false
  })
  if (symbolic.exitCode === 0 && symbolic.stdout.trim()) {
    return { detached: false, branch: symbolic.stdout.trim() }
  }
  return { detached: true, branch: null }
}

export function repositoryDisplayName(repoPath: string): string {
  return path.basename(repoPath)
}
