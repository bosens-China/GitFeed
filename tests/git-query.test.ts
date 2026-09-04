import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { execa } from 'execa'
import { queryMultiRepoCommits, queryRepository } from '../src/main/git/query'
import { createDefaultFilters, type RepositoryRecord } from '../src/shared/models'

const temporaryDirectories: string[] = []

async function git(repoPath: string, args: string[], env?: NodeJS.ProcessEnv): Promise<string> {
  const result = await execa('git', args, { cwd: repoPath, env })
  return result.stdout
}

afterEach(async () => {
  await Promise.all(
    temporaryDirectories
      .splice(0)
      .map((directory) => fs.rm(directory, { recursive: true, force: true }))
  )
})

describe('queryRepository with a real Git repository', () => {
  it('loads first-view commits and authors by author date with real line stats', async () => {
    const repoPath = await fs.mkdtemp(path.join(os.tmpdir(), 'gitfeed-query-'))
    temporaryDirectories.push(repoPath)
    await git(repoPath, ['init', '-q'])
    await git(repoPath, ['config', 'user.name', 'Reviewer'])
    await git(repoPath, ['config', 'user.email', 'reviewer@example.com'])
    await fs.writeFile(path.join(repoPath, 'work.txt'), 'first\nsecond\n', 'utf8')
    await git(repoPath, ['add', 'work.txt'])

    const authorDate = new Date(Date.now() - 2 * 60 * 1000)
    const committerDate = new Date(authorDate.getTime() + 7 * 24 * 60 * 60 * 1000)
    await git(repoPath, ['commit', '-q', '-m', 'first view'], {
      ...process.env,
      GIT_AUTHOR_DATE: authorDate.toISOString(),
      GIT_COMMITTER_DATE: committerDate.toISOString()
    })
    await git(repoPath, ['mv', 'work.txt', 'renamed.txt'])
    await git(repoPath, ['commit', '-q', '-m', 'rename'], {
      ...process.env,
      GIT_AUTHOR_DATE: new Date(authorDate.getTime() + 60 * 1000).toISOString(),
      GIT_COMMITTER_DATE: new Date(committerDate.getTime() + 60 * 1000).toISOString()
    })

    const branch = (await git(repoPath, ['branch', '--show-current'])).trim()
    const result = await queryRepository(repoPath, {
      ...createDefaultFilters(),
      branch
    })

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.commits).toHaveLength(2)
    expect(result.authors).toEqual([{ name: 'Reviewer', email: 'reviewer@example.com' }])
    expect(result.stats).toEqual({
      commitCount: 2,
      additions: 2,
      deletions: 0,
      changedFiles: 2
    })
    expect(result.commits[0].files[0]).toMatchObject({
      path: 'renamed.txt',
      previousPath: 'work.txt',
      status: 'R',
      additions: 0,
      deletions: 0,
      binary: false
    })
    expect(result.commits[1].files[0]).toMatchObject({
      path: 'work.txt',
      status: 'A',
      additions: 2,
      deletions: 0,
      binary: false
    })
  })

  it('diagnoses non-git and empty repository correctly', async () => {
    const emptyDirPath = await fs.mkdtemp(path.join(os.tmpdir(), 'gitfeed-empty-'))
    temporaryDirectories.push(emptyDirPath)

    const { diagnoseRepository } = await import('../src/main/git/query')
    const diagEmpty = await diagnoseRepository(emptyDirPath)
    expect(diagEmpty.status).toBe('not_git')

    await git(emptyDirPath, ['init', '-q'])
    const diagAfterInit = await diagnoseRepository(emptyDirPath)
    expect(diagAfterInit.status).toBe('empty')
  })

  it('keeps identical commit hashes from different repositories', async () => {
    const rootPath = await fs.mkdtemp(path.join(os.tmpdir(), 'gitfeed-multi-query-'))
    temporaryDirectories.push(rootPath)
    const firstRepoPath = path.join(rootPath, 'repo-one')
    const secondRepoPath = path.join(rootPath, 'repo-two')
    await fs.mkdir(firstRepoPath)
    await git(firstRepoPath, ['init', '-q'])
    await git(firstRepoPath, ['config', 'user.name', 'Reviewer'])
    await git(firstRepoPath, ['config', 'user.email', 'reviewer@example.com'])
    await fs.writeFile(path.join(firstRepoPath, 'shared.txt'), 'same commit\n', 'utf8')
    await git(firstRepoPath, ['add', 'shared.txt'])
    await git(firstRepoPath, ['commit', '-q', '-m', 'feat: shared history'])
    await execa('git', ['clone', '-q', firstRepoPath, secondRepoPath], { cwd: rootPath })

    const branch = (await git(firstRepoPath, ['branch', '--show-current'])).trim()
    const makeRepo = (id: string, repoPath: string): RepositoryRecord => ({
      id,
      path: repoPath,
      name: id,
      enabledForReport: true,
      selectedBranches: id === 'repo-one' ? ['--all'] : [branch],
      filters: createDefaultFilters()
    })
    const result = await queryMultiRepoCommits({
      repos: [makeRepo('repo-one', firstRepoPath), makeRepo('repo-two', secondRepoPath)],
      myIdentities: [],
      timeRangeState: {
        preset: 'custom',
        customStart: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
        customEnd: new Date(Date.now() + 60 * 60 * 1000).toISOString()
      },
      includeMerge: false
    })

    expect(result.allCommits).toHaveLength(2)
    expect(new Set(result.allCommits.map((item) => item.repoId))).toEqual(
      new Set(['repo-one', 'repo-two'])
    )
    expect(result.summaryStats.changedFiles).toBe(2)
    expect(result.repos[0].resolvedBranches).toEqual([branch])
  })

  it('queries a temporary local branch without changing the checked-out branch', async () => {
    const repoPath = await fs.mkdtemp(path.join(os.tmpdir(), 'gitfeed-branch-override-'))
    temporaryDirectories.push(repoPath)
    await git(repoPath, ['init', '-q'])
    await git(repoPath, ['config', 'user.name', 'Reviewer'])
    await git(repoPath, ['config', 'user.email', 'reviewer@example.com'])

    const mainBranch = (await git(repoPath, ['branch', '--show-current'])).trim()
    await fs.writeFile(path.join(repoPath, 'main.txt'), 'main\n', 'utf8')
    await git(repoPath, ['add', 'main.txt'])
    await git(repoPath, ['commit', '-q', '-m', 'feat: main history'])

    const featureBranch = 'feature/read-only-analysis'
    await git(repoPath, ['checkout', '-q', '-b', featureBranch])
    await fs.writeFile(path.join(repoPath, 'feature.txt'), 'feature\n', 'utf8')
    await git(repoPath, ['add', 'feature.txt'])
    await git(repoPath, ['commit', '-q', '-m', 'feat: branch-only change'])
    await git(repoPath, ['checkout', '-q', mainBranch])

    const result = await queryMultiRepoCommits({
      repos: [
        {
          id: 'repo-one',
          path: repoPath,
          name: 'repo-one',
          enabledForReport: true,
          selectedBranches: [mainBranch],
          filters: createDefaultFilters()
        }
      ],
      myIdentities: [],
      timeRangeState: {
        preset: 'custom',
        customStart: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
        customEnd: new Date(Date.now() + 60 * 60 * 1000).toISOString()
      },
      includeMerge: false,
      branchOverride: { repoId: 'repo-one', branch: featureBranch }
    })

    expect(result.repos[0].resolvedBranches).toEqual([featureBranch])
    expect(result.allCommits.map((commit) => commit.message)).toContain('feat: branch-only change')
    expect(result.allCommits.every((commit) => commit.branch === featureBranch)).toBe(true)
    expect(await git(repoPath, ['branch', '--show-current'])).toBe(mainBranch)
  })
})
