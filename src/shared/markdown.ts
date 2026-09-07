import type { CommitItem } from './models'
import { parseCommitCategory } from './commit-category'
import { computeStats } from './commit-utils'

function escapeMarkdownInline(text: string): string {
  return text.replace(/\s*\r?\n\s*/g, ' ').replace(/([\\`*_[\]{}()|<>])/g, '\\$1')
}

export function commitPreviewLink(commit: CommitItem): string {
  return `#commit/${encodeURIComponent(commit.repoId ?? commit.repoName ?? '')}/${commit.hash}`
}

export function buildCommitsWeeklyReportMarkdown(
  commits: CommitItem[],
  options: {
    title?: string
    timeRangeLabel?: string
    groupMode?: 'byRepo' | 'singleRepo'
    linkCommits?: boolean
  } = {}
): string {
  if (commits.length === 0) {
    return ''
  }

  const reference = (commit: CommitItem): string => {
    const code = `\`${commit.shortHash}\``
    return options.linkCommits ? `[${code}](<${commitPreviewLink(commit)}>)` : code
  }

  const lines: string[] = []
  const title = options.title || '工作周报'
  lines.push(`# ${escapeMarkdownInline(title)}`, '')

  if (options.timeRangeLabel) {
    lines.push(`> 周期：${options.timeRangeLabel}`)
  }

  const stats = computeStats(commits)

  lines.push(
    `> 汇总：共 ${commits.length} 次提交，代码变动 +${stats.additions.toLocaleString()} / -${stats.deletions.toLocaleString()} 行，涉及 ${stats.changedFiles} 个文件。`,
    ''
  )

  if (options.groupMode === 'byRepo') {
    const repoGroups = new Map<string, { name: string; commits: CommitItem[] }>()
    for (const c of commits) {
      const name = c.repoName || '其他工程'
      const key = c.repoId || name
      if (!repoGroups.has(key)) {
        repoGroups.set(key, { name, commits: [] })
      }
      repoGroups.get(key)!.commits.push(c)
    }

    for (const { name: repoName, commits: repoCommits } of repoGroups.values()) {
      lines.push(`## ${escapeMarkdownInline(repoName)}`, '')
      const catMap = new Map<string, { label: string; commits: CommitItem[] }>()
      for (const c of repoCommits) {
        const cat = parseCommitCategory(c.message)
        if (!catMap.has(cat.key)) {
          catMap.set(cat.key, { label: `${cat.emoji} ${cat.label}`, commits: [] })
        }
        catMap.get(cat.key)!.commits.push(c)
      }
      for (const group of catMap.values()) {
        lines.push(`### ${group.label}`, '')
        for (const c of group.commits) {
          const commitTitle = escapeMarkdownInline(c.message.split('\n')[0] || '(无标题)')
          lines.push(`- ${commitTitle} (${reference(c)})`)
        }
        lines.push('')
      }
    }
  } else {
    const catMap = new Map<string, { label: string; commits: CommitItem[] }>()
    for (const c of commits) {
      const cat = parseCommitCategory(c.message)
      if (!catMap.has(cat.key)) {
        catMap.set(cat.key, { label: `${cat.emoji} ${cat.label}`, commits: [] })
      }
      catMap.get(cat.key)!.commits.push(c)
    }
    for (const group of catMap.values()) {
      lines.push(`## ${group.label}`, '')
      for (const c of group.commits) {
        const commitTitle = escapeMarkdownInline(c.message.split('\n')[0] || '(无标题)')
        lines.push(`- ${commitTitle} (${reference(c)})`)
      }
      lines.push('')
    }
  }

  return lines.join('\n').trim()
}
