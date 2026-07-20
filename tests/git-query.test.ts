import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { execa } from 'execa'
import { queryRepository } from '../src/main/git/query'
import { createDefaultFilters } from '../src/shared/models'

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
})
