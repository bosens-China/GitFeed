import fs from 'node:fs/promises'
import path from 'node:path'
import { app } from 'electron'
import {
  createDefaultFilters,
  type AuthorIdentity,
  type RepositoryFilters,
  type RepositoryRecord,
  type RepositoryUpdate,
  type WorkbenchState
} from '@shared/models'

const STORE_VERSION = 2 as const
let mutationQueue: Promise<void> = Promise.resolve()

function storePath(): string {
  return path.join(app.getPath('userData'), 'workbench.json')
}

function emptyState(): WorkbenchState {
  return {
    version: STORE_VERSION,
    repositories: [],
    activeRepositoryId: null,
    myIdentities: [],
    includeMergeDefault: false
  }
}

export async function readWorkbenchState(): Promise<WorkbenchState> {
  try {
    const raw = await fs.readFile(storePath(), 'utf8')
    const parsed = JSON.parse(raw) as WorkbenchState & { version: number }
    if (!parsed || typeof parsed !== 'object' || !Array.isArray(parsed.repositories)) {
      return emptyState()
    }

    const repositories = parsed.repositories.map(normalizeRepository)
    const activeRepositoryId = repositories.some((repo) => repo.id === parsed.activeRepositoryId)
      ? parsed.activeRepositoryId
      : (repositories[0]?.id ?? null)

    const myIdentities = Array.isArray(parsed.myIdentities) ? parsed.myIdentities : []
    const includeMergeDefault = Boolean(parsed.includeMergeDefault)

    return {
      version: STORE_VERSION,
      repositories,
      activeRepositoryId,
      myIdentities,
      includeMergeDefault
    }
  } catch {
    return emptyState()
  }
}

function normalizeRepository(
  repo: Partial<RepositoryRecord> & { id: string; path: string; name: string }
): RepositoryRecord {
  const defaultBranch = repo.filters?.branch ?? null
  const selectedBranches = Array.isArray(repo.selectedBranches)
    ? repo.selectedBranches
    : defaultBranch
      ? [defaultBranch]
      : []

  return {
    id: repo.id,
    path: repo.path,
    name: repo.name,
    enabledForReport: repo.enabledForReport ?? true,
    selectedBranches,
    availableBranches: Array.isArray(repo.availableBranches)
      ? repo.availableBranches
      : selectedBranches,
    status: repo.status ?? 'available',
    lastCheckedAt: repo.lastCheckedAt,
    errorMessage: repo.errorMessage,
    filters: {
      ...createDefaultFilters(),
      ...repo.filters,
      branch: defaultBranch,
      authors: repo.filters?.authors ?? { mode: 'all' },
      timeRange: repo.filters?.timeRange ?? { preset: 'thisWeek' }
    }
  }
}

export async function writeWorkbenchState(state: WorkbenchState): Promise<void> {
  const file = storePath()
  const tempFile = `${file}.tmp`
  await fs.mkdir(path.dirname(file), { recursive: true })
  await fs.writeFile(tempFile, JSON.stringify(state, null, 2), 'utf8')
  await fs.rename(tempFile, file)
}

function mutateWorkbenchState(mutate: (state: WorkbenchState) => void): Promise<WorkbenchState> {
  const result = mutationQueue.then(async () => {
    const state = await readWorkbenchState()
    mutate(state)
    await writeWorkbenchState(state)
    return state
  })
  mutationQueue = result.then(
    () => undefined,
    () => undefined
  )
  return result
}

export async function addRepositoryRecord(record: RepositoryRecord): Promise<WorkbenchState> {
  return mutateWorkbenchState((state) => {
    if (state.repositories.some((repo) => repo.id === record.id)) {
      throw Object.assign(new Error('该仓库已在工作台中'), { code: 'DUPLICATE' as const })
    }
    state.repositories.push(record)
    state.activeRepositoryId = record.id
  })
}

export async function removeRepositoryRecord(id: string): Promise<WorkbenchState> {
  return mutateWorkbenchState((state) => {
    state.repositories = state.repositories.filter((repo) => repo.id !== id)
    if (state.activeRepositoryId === id) {
      state.activeRepositoryId = state.repositories[0]?.id ?? null
    }
  })
}

export async function updateRepositoryRecord(
  id: string,
  update: RepositoryUpdate &
    Partial<
      Pick<RepositoryRecord, 'availableBranches' | 'status' | 'lastCheckedAt' | 'errorMessage'>
    >
): Promise<WorkbenchState> {
  return mutateWorkbenchState((state) => {
    const repoIndex = state.repositories.findIndex((item) => item.id === id)
    if (repoIndex === -1) {
      throw new Error('仓库不存在')
    }
    state.repositories[repoIndex] = {
      ...state.repositories[repoIndex],
      ...update
    }
  })
}

export async function updateMyIdentities(identities: AuthorIdentity[]): Promise<WorkbenchState> {
  return mutateWorkbenchState((state) => {
    state.myIdentities = identities
  })
}

export async function updateIncludeMergeDefault(
  includeMergeDefault: boolean
): Promise<WorkbenchState> {
  return mutateWorkbenchState((state) => {
    state.includeMergeDefault = includeMergeDefault
  })
}

export async function setActiveRepository(id: string | null): Promise<WorkbenchState> {
  return mutateWorkbenchState((state) => {
    if (id && !state.repositories.some((repo) => repo.id === id)) {
      throw new Error('仓库不存在')
    }
    state.activeRepositoryId = id
  })
}

export async function updateRepositoryFilters(
  id: string,
  filters: RepositoryFilters
): Promise<WorkbenchState> {
  return mutateWorkbenchState((state) => {
    const repo = state.repositories.find((item) => item.id === id)
    if (!repo) {
      throw new Error('仓库不存在')
    }
    repo.filters = filters
  })
}

export async function reconcileRepositoryFilters(
  id: string,
  expected: RepositoryFilters,
  filters: RepositoryFilters
): Promise<WorkbenchState> {
  return mutateWorkbenchState((state) => {
    const repo = state.repositories.find((item) => item.id === id)
    if (!repo) {
      throw new Error('仓库不存在')
    }
    if (JSON.stringify(repo.filters) === JSON.stringify(expected)) {
      repo.filters = filters
    }
  })
}
