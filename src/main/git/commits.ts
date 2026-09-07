import type { CommitItem, FileChange, FileChangeStatus } from '@shared/models'
import { runGit } from './run'

const COMMIT_FIELD_SEP = '\u001f'
const COMMIT_RECORD_SEP = '\u001e'

interface RawCommit {
  hash: string
  authorName: string
  authorEmail: string
  authoredAt: string
  parents: string[]
  message: string
}

export async function listCommitsInRange(options: {
  repoPath: string
  branch?: string
  branches?: string[]
  start: Date
  end: Date
  includeMerge: boolean
  repoId?: string
  repoName?: string
}): Promise<CommitItem[]> {
  const { repoPath, branch, branches, start, end, includeMerge, repoId, repoName } = options
  const targetBranches = branches && branches.length > 0 ? branches : branch ? [branch] : []
  if (targetBranches.length === 0) {
    return []
  }

  const format = ['%H', '%an', '%ae', '%aI', '%P', '%B'].join(COMMIT_FIELD_SEP)

  const args = [
    '-c',
    'core.quotepath=false',
    'log',
    `--pretty=format:${format}${COMMIT_RECORD_SEP}`,
    ...targetBranches,
    '--'
  ]

  // Git's date limiters use committer date; fetch metadata first and filter by author date below.
  const { stdout } = await runGit(repoPath, args)
  const rawCommits = parseCommitLog(stdout)
  const deduped = dedupeByHash(rawCommits)

  const filtered = deduped
    .filter((commit) => {
      if (!includeMerge && commit.parents.length > 1) {
        return false
      }
      const time = new Date(commit.authoredAt).getTime()
      return time >= start.getTime() && time <= end.getTime()
    })
    .sort((a, b) => new Date(b.authoredAt).getTime() - new Date(a.authoredAt).getTime())

  const concurrency = 8
  const commits: CommitItem[] = []

  for (let i = 0; i < filtered.length; i += concurrency) {
    const batch = filtered.slice(i, i + concurrency)
    const items = await Promise.all(
      batch.map(async (raw) => {
        const files = await listCommitFiles(repoPath, raw.hash)
        return {
          hash: raw.hash,
          shortHash: raw.hash.slice(0, 7),
          authorName: raw.authorName,
          authorEmail: raw.authorEmail,
          authoredAt: raw.authoredAt,
          message: raw.message.replace(/\r\n/g, '\n').replace(/\s+$/u, ''),
          isMerge: raw.parents.length > 1,
          branch: targetBranches.join(', '),
          repoId,
          repoName,
          files
        } satisfies CommitItem
      })
    )
    commits.push(...items)
  }

  return commits
}

export async function getCommitDiff(repoPath: string, hash: string): Promise<string> {
  const baseArgs = [
    '-c',
    'core.quotepath=false',
    'show',
    '--format=',
    '--no-color',
    '--no-ext-diff',
    '--unified=3',
    '--root',
    '-M'
  ]

  try {
    const { stdout } = await runGit(repoPath, [
      ...baseArgs,
      '--diff-merges=first-parent',
      hash,
      '--'
    ])
    return stdout
  } catch {
    const { stdout } = await runGit(repoPath, [...baseArgs, hash, '--'])
    return stdout
  }
}

function parseCommitLog(stdout: string): RawCommit[] {
  if (!stdout.trim()) {
    return []
  }

  const records = stdout
    .split(COMMIT_RECORD_SEP)
    .map((part) => part.replace(/^\n/, ''))
    .filter(Boolean)
  const commits: RawCommit[] = []

  for (const record of records) {
    const parts = record.split(COMMIT_FIELD_SEP)
    if (parts.length < 6) continue
    const [hash, authorName, authorEmail, authoredAt, parentsRaw, ...messageParts] = parts
    const message = messageParts.join(COMMIT_FIELD_SEP).replace(/\n$/u, '')
    commits.push({
      hash,
      authorName,
      authorEmail,
      authoredAt,
      parents: parentsRaw.trim() ? parentsRaw.trim().split(/\s+/) : [],
      message
    })
  }

  return commits
}

function dedupeByHash(commits: RawCommit[]): RawCommit[] {
  const map = new Map<string, RawCommit>()
  for (const commit of commits) {
    if (!map.has(commit.hash)) {
      map.set(commit.hash, commit)
    }
  }
  return [...map.values()]
}

async function listCommitFiles(repoPath: string, hash: string): Promise<FileChange[]> {
  const args = [
    '-c',
    'core.quotepath=false',
    'show',
    '--format=',
    '--raw',
    '--numstat',
    '-z',
    '--no-ext-diff',
    '--no-textconv',
    '-M',
    '--diff-merges=first-parent',
    hash,
    '--'
  ]

  let stdout = ''
  try {
    ;({ stdout } = await runGit(repoPath, args))
  } catch {
    ;({ stdout } = await runGit(repoPath, [
      '-c',
      'core.quotepath=false',
      'show',
      '--format=',
      '--raw',
      '--numstat',
      '-z',
      '--no-ext-diff',
      '--no-textconv',
      '-M',
      hash,
      '--'
    ]))
  }

  return parseNameStatusAndNumstat(stdout)
}

function parseNameStatusAndNumstat(output: string): FileChange[] {
  const records = output.split('\u0000')
  const statusMap = new Map<string, { status: FileChangeStatus; previousPath?: string }>()
  const statMap = new Map<
    string,
    { additions: number | null; deletions: number | null; binary: boolean }
  >()

  // -z 将路径独立编码，避免把文件名中的制表符、换行或 => 当作分隔符。
  for (let index = 0; index < records.length; index += 1) {
    const record = records[index].replace(/^\n+/, '')
    if (record.startsWith(':')) {
      const status = record.trim().split(/\s+/).at(-1)?.[0] as FileChangeStatus
      const firstPath = records[++index]
      if (status === 'R' || status === 'C') {
        statusMap.set(records[++index], { status, previousPath: firstPath })
      } else {
        statusMap.set(firstPath, { status })
      }
      continue
    }

    const numstat = record.match(/^(\d+|-)\t(\d+|-)\t([\s\S]*)$/)
    if (!numstat) continue
    const [, addRaw, delRaw, pathRaw] = numstat
    let filePath = pathRaw
    if (!filePath) {
      // 重命名的 numstat 路径为空，后面两个 NUL 字段分别是旧、新路径。
      index += 1
      filePath = records[++index]
    }
    const binary = addRaw === '-' || delRaw === '-'
    statMap.set(filePath, {
      additions: binary ? null : Number(addRaw),
      deletions: binary ? null : Number(delRaw),
      binary
    })
  }

  const paths = new Set([...statusMap.keys(), ...statMap.keys()])
  const files: FileChange[] = []
  for (const filePath of paths) {
    const statusInfo = statusMap.get(filePath)
    const stats = statMap.get(filePath)
    files.push({
      path: filePath,
      status: statusInfo?.status ?? 'M',
      previousPath: statusInfo?.previousPath,
      additions: stats?.additions ?? null,
      deletions: stats?.deletions ?? null,
      binary: stats?.binary ?? false
    })
  }

  return files.sort((a, b) => a.path.localeCompare(b.path))
}
