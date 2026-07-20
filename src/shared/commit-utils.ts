import type {
  AuthorIdentity,
  CommitItem,
  CommitStats,
  RepositoryFilters,
  RepositoryQueryResult
} from './models'
import { authorKey } from './models'

export function computeStats(commits: CommitItem[]): CommitStats {
  const paths = new Set<string>()
  let additions = 0
  let deletions = 0

  for (const commit of commits) {
    for (const file of commit.files) {
      paths.add(file.path)
      if (!file.binary) {
        additions += file.additions ?? 0
        deletions += file.deletions ?? 0
      }
    }
  }

  return {
    commitCount: commits.length,
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

export function reconcileAuthorsFilter(
  filter: RepositoryFilters['authors'],
  available: AuthorIdentity[]
): RepositoryFilters['authors'] {
  if (filter.mode === 'all') {
    return { mode: 'all' }
  }

  const availableKeys = new Set(available.map(authorKey))
  const stillValid = filter.authors.filter((author) => availableKeys.has(authorKey(author)))

  if (stillValid.length !== filter.authors.length) {
    // 存在失效作者：整表置空
    return { mode: 'selected', authors: [] }
  }

  return { mode: 'selected', authors: stillValid }
}

export function filterCommitsByAuthors(
  commits: CommitItem[],
  authors: RepositoryFilters['authors']
): CommitItem[] {
  if (authors.mode === 'all') {
    return commits
  }
  if (authors.authors.length === 0) {
    return []
  }
  const selected = new Set(authors.authors.map(authorKey))
  return commits.filter((commit) =>
    selected.has(authorKey({ name: commit.authorName, email: commit.authorEmail }))
  )
}

export function assertQueryOk(
  result: RepositoryQueryResult
): asserts result is Extract<RepositoryQueryResult, { ok: true }> {
  if (!result.ok) {
    throw new Error(result.error)
  }
}
