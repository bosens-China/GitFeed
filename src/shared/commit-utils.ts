import type { AuthorIdentity, CommitItem, ActivityStats } from './models'
import { authorKey } from './models'
import { localDateKey } from './time-range'

export function computeStats(commits: CommitItem[]): ActivityStats {
  const paths = new Set<string>()
  const repos = new Set<string>()
  const days = new Set<string>()
  let additions = 0
  let deletions = 0

  for (const commit of commits) {
    const repo = commit.repoId ?? commit.repoName ?? ''
    if (repo) repos.add(repo)
    days.add(localDateKey(commit.authoredAt))
    for (const file of commit.files) {
      paths.add(`${repo}\u0000${file.path}`)
      if (!file.binary) {
        additions += file.additions ?? 0
        deletions += file.deletions ?? 0
      }
    }
  }

  return {
    commitCount: commits.length,
    activeRepoCount: repos.size,
    activeDayCount: days.size,
    additions,
    deletions,
    changedFiles: paths.size
  }
}

export function collectAuthors(commits: CommitItem[]): AuthorIdentity[] {
  const map = new Map<string, AuthorIdentity>()
  for (const commit of commits) {
    const identity = { name: commit.authorName, email: commit.authorEmail }
    map.set(authorKey(identity), identity)
  }
  return [...map.values()].sort((a, b) =>
    a.name === b.name ? a.email.localeCompare(b.email) : a.name.localeCompare(b.name)
  )
}
