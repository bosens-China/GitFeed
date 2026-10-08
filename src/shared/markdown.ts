import type { CommitItem } from './models'
import { computeStats } from './commit-utils'
import { localDateKey } from './time-range'
import { computeHolidayActivityStats, type HolidayCalendar } from './holiday-calendar'

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
    showRepo?: boolean
    linkCommits?: boolean
    holidayCalendar?: HolidayCalendar
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

  if (options.holidayCalendar) {
    const activity = computeHolidayActivityStats(commits, options.holidayCalendar)
    lines.push(
      activity.unknownDayCount === 0
        ? `> 日期：活跃工作日 ${activity.workdayCount} 天，活跃休息日 ${activity.restDayCount} 天。`
        : `> 日期：${activity.unknownDayCount} 个活跃日期缺少节假日数据，工作日统计暂不可用。`,
      ''
    )
  }

  const byDay = Map.groupBy(
    [...commits].sort((a, b) => Date.parse(b.authoredAt) - Date.parse(a.authoredAt)),
    (commit) => localDateKey(commit.authoredAt)
  )
  for (const [day, dayCommits] of byDay) {
    const holiday = options.holidayCalendar?.days.get(day)
    const dateLabel = holiday
      ? ` · ${escapeMarkdownInline(holiday.name)}${holiday.isOffDay ? '放假' : '调休上班'}`
      : ''
    lines.push(`## ${day}${dateLabel}`, '')
    for (const commit of dayCommits) {
      const [subject, ...body] = commit.message.replace(/\r\n/g, '\n').split('\n')
      const repo = options.showRepo
        ? `**${escapeMarkdownInline(commit.repoName || '其他工程')}** · `
        : ''
      const time = new Date(commit.authoredAt).toLocaleTimeString('zh-CN', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
      })
      lines.push(
        `- ${time} ${repo}${escapeMarkdownInline(subject || '(无标题)')} (${reference(commit)})`
      )
      if (body.length > 0) {
        const bodyText = body.join('\n')
        let fence = '~~~'
        while (bodyText.includes(fence)) fence += '~'
        lines.push('', `  ${fence}text`)
        for (const line of body) {
          lines.push(`  ${line}`)
        }
        lines.push(`  ${fence}`)
      }
      lines.push('')
    }
  }

  return lines.join('\n').trim()
}
