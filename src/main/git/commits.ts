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
  branch: string
  start: Date
  end: Date
  includeMerge: boolean
}): Promise<CommitItem[]> {
  const { repoPath, branch, start, end, includeMerge } = options

  const format = ['%H', '%an', '%ae', '%aI', '%P', '%B'].join(COMMIT_FIELD_SEP)

  const args = [
    '-c',
    'core.quotepath=false',
    'log',
    `--pretty=format:${format}${COMMIT_RECORD_SEP}`,
    branch,
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
          branch,
          files
        } satisfies CommitItem
      })
    )
    commits.push(...items)
  }

  return commits
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
    '-M',
    '--diff-merges=first-parent',
    hash
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
      '-M',
      hash
    ]))
  }

  return parseNameStatusAndNumstat(stdout)
}

function parseNameStatusAndNumstat(output: string): FileChange[] {
  const lines = output.split(/\r?\n/).filter((line) => line.length > 0)
  const statusMap = new Map<string, { status: FileChangeStatus; previousPath?: string }>()
  const statMap = new Map<
    string,
    { additions: number | null; deletions: number | null; binary: boolean }
  >()

  for (const line of lines) {
    if (line.startsWith(':')) {
      const parts = line.split('\t')
      const statusToken = parts[0].trim().split(/\s+/).at(-1) ?? 'M'
      const status = statusToken[0] as FileChangeStatus
      if (status === 'R' || status === 'C') {
        statusMap.set(parts[2], { status, previousPath: parts[1] })
      } else {
        statusMap.set(parts[1], { status })
      }
      continue
    }

    if (/^[AMDCRTUX]\d*\t/.test(line) || /^R\d*\t/.test(line) || /^C\d*\t/.test(line)) {
      const parts = line.split('\t')
      const statusToken = parts[0]
      const status = statusToken[0] as FileChangeStatus
      if (status === 'R' || status === 'C') {
        const previousPath = parts[1]
        const pathName = parts[2]
        statusMap.set(pathName, { status, previousPath })
      } else {
        statusMap.set(parts[1], { status })
      }
      continue
    }

    const numstat = line.match(/^(\d+|-)\t(\d+|-)\t(.+)$/)
    if (numstat) {
      const [, addRaw, delRaw, pathRaw] = numstat
      let filePath = pathRaw
      let previousPath: string | undefined
      const renameMatch = pathRaw.match(/^(.*) => (.*)$/) || pathRaw.match(/^\{(.*) => (.*)\}$/)
      if (pathRaw.includes('=>')) {
        // formats: "old => new" or "{old => new}/tail"
        const brace = pathRaw.match(/^(.*)\{(.*) => (.*)\}(.*)$/)
        if (brace) {
          previousPath = `${brace[1]}${brace[2]}${brace[4]}`
          filePath = `${brace[1]}${brace[3]}${brace[4]}`
        } else if (renameMatch) {
          previousPath = renameMatch[1]
          filePath = renameMatch[2]
        }
      }

      const binary = addRaw === '-' || delRaw === '-'
      statMap.set(filePath, {
        additions: binary ? null : Number(addRaw),
        deletions: binary ? null : Number(delRaw),
        binary
      })
      if (previousPath && !statusMap.has(filePath)) {
        statusMap.set(filePath, { status: 'R', previousPath })
      }
    }
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
