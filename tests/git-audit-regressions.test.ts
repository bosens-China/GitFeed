import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { execa } from 'execa'
import { afterEach, beforeEach, expect, it } from 'vitest'
import { listCommitsInRange } from '../src/main/git/commits'
import { queryMultiRepoCommits } from '../src/main/git/query'
import { createDefaultFilters, type CommitItem, type RepositoryRecord } from '../src/shared/models'

let repoPath: string
const git = async (...args: string[]): Promise<string> =>
  (await execa('git', args, { cwd: repoPath })).stdout
const range = {
  preset: 'custom' as const,
  customStart: '2000-01-01T00:00:00Z',
  customEnd: '2100-01-01T00:00:00Z'
}
const readCommits = (branches = ['main']): Promise<CommitItem[]> =>
  listCommitsInRange({
    repoPath,
    branches,
    start: new Date(range.customStart),
    end: new Date(range.customEnd),
    includeMerge: true
  })
const record = (): RepositoryRecord => ({
  id: 'repo',
  name: 'Repo',
  path: repoPath,
  enabledForReport: false,
  selectedBranches: ['main'],
  filters: createDefaultFilters()
})

beforeEach(async () => {
  repoPath = await fs.mkdtemp(path.join(os.tmpdir(), 'gitfeed-regression-'))
  await git('init', '-q', '-b', 'main')
  await git('config', 'user.name', 'Reviewer')
  await git('config', 'user.email', 'reviewer@example.com')
  await git('config', 'commit.gpgsign', 'false')
})
afterEach(async () => {
  await fs.rm(repoPath, { recursive: true, force: true })
})

it('preserves special filenames, real renames and binary stats', async () => {
  // Windows 不允许 >、制表符和换行文件名；其他平台验证全部合法字符。
  const special =
    process.platform === 'win32'
      ? ['braces {name}.txt']
      : [
          'before => after.txt',
          'tab\tname.txt',
          '\nline\nname.txt',
          'quote"name.txt',
          'slash\\name.txt'
        ]
  for (const name of special) await fs.writeFile(path.join(repoPath, name), 'one\ntwo\n')
  await fs.writeFile(path.join(repoPath, 'old.txt'), 'rename me\n')
  await fs.writeFile(path.join(repoPath, 'binary.dat'), Buffer.from([0, 1, 2]))
  await git('add', '--all')
  await git('commit', '-qm', 'add files')
  const added = (await readCommits())[0]
  expect(added.files).toHaveLength(special.length + 2)
  for (const name of special)
    expect(added.files).toContainEqual({
      path: name,
      status: 'A',
      previousPath: undefined,
      additions: 2,
      deletions: 0,
      binary: false
    })
  expect(added.files.find((f) => f.path === 'binary.dat')).toMatchObject({
    binary: true,
    additions: null,
    deletions: null
  })
  const renamed = process.platform === 'win32' ? 'new {name}.txt' : 'new =>\tname.txt'
  await git('mv', 'old.txt', renamed)
  await git('commit', '-qm', 'rename file')
  const change = (await readCommits()).find((c) => c.message === 'rename file')!
  expect(change.files).toEqual([
    {
      path: renamed,
      previousPath: 'old.txt',
      status: 'R',
      additions: 0,
      deletions: 0,
      binary: false
    }
  ])
})

it('keeps disabled repositories available to scoped analysis but out of the full report', async () => {
  await git('commit', '--allow-empty', '-qm', 'base')
  const options = {
    repos: [record()],
    myIdentities: [],
    timeRangeState: range,
    includeMerge: false
  }
  expect((await queryMultiRepoCommits(options)).allCommits).toHaveLength(0)
  const scoped = await queryMultiRepoCommits({
    ...options,
    repoId: 'repo',
    repos: [
      ...options.repos,
      { ...record(), id: 'unrelated', path: path.join(repoPath, 'missing'), enabledForReport: true }
    ]
  })
  expect(scoped.allCommits).toHaveLength(1)
  expect(scoped.repos.map((r) => r.repoId)).toEqual(['repo'])
})

it('preserves healthy results and identifies failed repositories', async () => {
  await git('commit', '--allow-empty', '-qm', 'base')
  const result = await queryMultiRepoCommits({
    repos: [
      { ...record(), enabledForReport: true },
      { ...record(), id: 'missing', path: path.join(repoPath, 'missing'), enabledForReport: true }
    ],
    myIdentities: [],
    timeRangeState: range,
    includeMerge: false
  })
  expect(result.allCommits).toHaveLength(1)
  expect(result.repos[1]).toMatchObject({
    status: 'missing',
    commits: [],
    error: expect.any(String)
  })
})

it('labels the complete queried branch range without assigning feature commits to main', async () => {
  await git('commit', '--allow-empty', '-qm', 'base')
  await git('checkout', '-qb', 'feature')
  await git('commit', '--allow-empty', '-qm', 'feature only')
  await git('checkout', '-q', 'main')
  const commits = await readCommits(['main', 'feature'])
  expect(commits.find((c) => c.message === 'feature only')?.branch).toBe('main, feature')
  expect(commits).toHaveLength(2)
  expect(await git('branch', '--show-current')).toBe('main')
})
