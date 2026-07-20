import type {
  AuthorIdentity,
  CommitItem,
  CommitStats,
  RepositoryFilters,
  ResolvedTimeRange
} from './models'

function escapeMarkdownInline(text: string): string {
  return text.replace(/([\\`*_[\]{}()|<>])/g, '\\$1')
}

function codeFence(text: string): string {
  const longest = Math.max(0, ...Array.from(text.matchAll(/`+/g), (match) => match[0].length))
  return '`'.repeat(Math.max(3, longest + 1))
}

function formatAuthors(
  authors: RepositoryFilters['authors'],
  allAuthors: AuthorIdentity[]
): string {
  if (authors.mode === 'all') {
    return '全部'
  }
  if (authors.authors.length === 0) {
    return '无'
  }
  if (authors.authors.length === allAuthors.length && allAuthors.length > 0) {
    return '全部'
  }
  return authors.authors
    .map((author) => escapeMarkdownInline(`${author.name} <${author.email}>`))
    .join('、')
}

function formatLocalTime(iso: string): string {
  const date = new Date(iso)
  const pad = (n: number): string => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`
}

export interface MarkdownContext {
  repoName: string
  repoPath: string
  branch: string
  timeRange: ResolvedTimeRange
  authorsFilter: RepositoryFilters['authors']
  allAuthors: AuthorIdentity[]
  includeMerge: boolean
  stats: CommitStats
  commits: CommitItem[]
}

export function buildCommitsMarkdown(ctx: MarkdownContext): string {
  const lines: string[] = [
    '# Git 提交摘要',
    '',
    `- 仓库：${escapeMarkdownInline(ctx.repoName)}`,
    `- 路径：${escapeMarkdownInline(ctx.repoPath)}`,
    `- 分支：${escapeMarkdownInline(ctx.branch)}`,
    `- 时间：${ctx.timeRange.label}`,
    `- 作者：${formatAuthors(ctx.authorsFilter, ctx.allAuthors)}`,
    `- 包含 merge：${ctx.includeMerge ? '是' : '否'}`,
    `- 提交：${ctx.stats.commitCount}`,
    `- 代码行：+${ctx.stats.additions} / -${ctx.stats.deletions}`,
    `- 修改文件：${ctx.stats.changedFiles}`,
    '',
    '## 提交明细',
    ''
  ]

  if (ctx.commits.length === 0) {
    lines.push('（当前范围无提交）', '')
    return lines.join('\n')
  }

  for (const commit of ctx.commits) {
    const title = escapeMarkdownInline(commit.message.split('\n')[0] || '(无标题)')
    lines.push(`### ${commit.shortHash} ${title}`, '')
    lines.push(`- 作者：${escapeMarkdownInline(`${commit.authorName} <${commit.authorEmail}>`)}`)
    lines.push(`- 时间：${formatLocalTime(commit.authoredAt)}`)
    lines.push(`- 分支：${commit.branch}`)
    lines.push(`- Hash：\`${commit.hash}\``)
    if (commit.isMerge) {
      lines.push('- Merge：是')
    }
    lines.push('')

    const body = commit.message.includes('\n')
      ? commit.message.slice(commit.message.indexOf('\n') + 1).trim()
      : ''
    if (body) {
      const fence = codeFence(body)
      lines.push(fence)
      lines.push(body)
      lines.push(fence)
      lines.push('')
    }

    lines.push('文件：', '')
    if (commit.files.length === 0) {
      lines.push('- （无文件变更）')
    } else {
      for (const file of commit.files) {
        const rename =
          file.previousPath && file.previousPath !== file.path
            ? ` ${escapeMarkdownInline(file.previousPath)} → ${escapeMarkdownInline(file.path)}`
            : ` ${escapeMarkdownInline(file.path)}`
        const stats = file.binary ? 'binary' : `+${file.additions ?? 0}/-${file.deletions ?? 0}`
        lines.push(`- [${file.status}]${rename} (${stats})`)
      }
    }
    lines.push('')
  }

  return lines.join('\n')
}
