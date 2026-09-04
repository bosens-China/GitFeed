export type DiffLineKind = 'context' | 'addition' | 'deletion'

export interface DiffSideLine {
  lineNumber: number
  content: string
  kind: DiffLineKind
}

export interface DiffRow {
  oldLine: DiffSideLine | null
  newLine: DiffSideLine | null
}

export interface DiffHunk {
  header: string
  rows: DiffRow[]
}

export interface ParsedDiffFile {
  oldPath: string | null
  newPath: string | null
  binary: boolean
  hunks: DiffHunk[]
}

function stripPathPrefix(value: string): string | null {
  const path = value.trim()
  if (path === '/dev/null') return null
  return path.replace(/^[ab]\//u, '')
}

export function parseUnifiedDiff(patch: string): ParsedDiffFile[] {
  const files: ParsedDiffFile[] = []
  let file: ParsedDiffFile | null = null
  let hunk: DiffHunk | null = null
  let oldLineNumber = 0
  let newLineNumber = 0
  let deletions: DiffSideLine[] = []
  let additions: DiffSideLine[] = []

  const flushChanges = (): void => {
    if (!hunk || (deletions.length === 0 && additions.length === 0)) return
    const count = Math.max(deletions.length, additions.length)
    for (let index = 0; index < count; index += 1) {
      hunk.rows.push({
        oldLine: deletions[index] ?? null,
        newLine: additions[index] ?? null
      })
    }
    deletions = []
    additions = []
  }

  const flushFile = (): void => {
    flushChanges()
    if (file) files.push(file)
    file = null
    hunk = null
  }

  for (const line of patch.split(/\r?\n/u)) {
    if (line.startsWith('diff --git ')) {
      flushFile()
      const paths = line.match(/^diff --git a\/(.*) b\/(.*)$/u)
      file = {
        oldPath: paths?.[1] ?? null,
        newPath: paths?.[2] ?? null,
        binary: false,
        hunks: []
      }
      continue
    }

    if (!file) continue

    if (line.startsWith('Binary files ') || line === 'GIT binary patch') {
      file.binary = true
      continue
    }

    if (!hunk && line.startsWith('--- ')) {
      file.oldPath = stripPathPrefix(line.slice(4))
      continue
    }
    if (!hunk && line.startsWith('+++ ')) {
      file.newPath = stripPathPrefix(line.slice(4))
      continue
    }

    if (line.startsWith('@@ ')) {
      flushChanges()
      const ranges = line.match(/^@@ -(\d+)(?:,\d+)? \+(\d+)(?:,\d+)? @@/u)
      if (!ranges) continue
      oldLineNumber = Number(ranges[1])
      newLineNumber = Number(ranges[2])
      hunk = { header: line, rows: [] }
      file.hunks.push(hunk)
      continue
    }

    if (!hunk || line === '\\ No newline at end of file') continue

    if (line.startsWith('-')) {
      if (additions.length > 0) flushChanges()
      deletions.push({
        lineNumber: oldLineNumber,
        content: line.slice(1),
        kind: 'deletion'
      })
      oldLineNumber += 1
      continue
    }

    if (line.startsWith('+')) {
      additions.push({
        lineNumber: newLineNumber,
        content: line.slice(1),
        kind: 'addition'
      })
      newLineNumber += 1
      continue
    }

    if (line.startsWith(' ')) {
      flushChanges()
      const content = line.slice(1)
      hunk.rows.push({
        oldLine: { lineNumber: oldLineNumber, content, kind: 'context' },
        newLine: { lineNumber: newLineNumber, content, kind: 'context' }
      })
      oldLineNumber += 1
      newLineNumber += 1
    }
  }

  flushFile()
  return files
}
