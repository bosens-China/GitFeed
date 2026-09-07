import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { readWorkbenchState, updateRepositoryRecord } from '../src/main/store/workbench'

const storage = vi.hoisted(() => ({ directory: '' }))
vi.mock('electron', () => ({ app: { getPath: () => storage.directory } }))

beforeEach(async () => {
  storage.directory = await fs.mkdtemp(path.join(os.tmpdir(), 'gitfeed-store-'))
})
afterEach(async () => {
  await fs.rm(storage.directory, { recursive: true, force: true })
})

it.each([
  { selectedBranches: undefined, expected: ['legacy'] },
  { selectedBranches: ['main'], expected: ['main'] },
  { selectedBranches: [], expected: [] }
])(
  'preserves branch selection while migrating legacy filters: $expected',
  async ({ selectedBranches, expected }) => {
    const viewMemory = {
      timeRange: { preset: 'thisWeek' },
      selectedAuthorKeys: ['Ann\u0000ann@example.com'],
      searchKeyword: 'fix',
      activeTabKey: 'changes',
      analysisBranch: 'topic'
    }
    const identities = [{ name: 'Ann', email: 'ann@example.com' }]
    const file = path.join(storage.directory, 'workbench.json')
    await fs.writeFile(
      file,
      JSON.stringify({
        version: 2,
        repositories: [
          {
            id: 'repo',
            path: '/repo',
            name: 'Repo',
            filters: { branch: 'legacy' },
            selectedBranches,
            viewMemory
          }
        ],
        activeRepositoryId: 'repo',
        myIdentities: identities,
        includeMergeDefault: true
      })
    )

    const initial = await readWorkbenchState()
    expect(initial.repositories[0].selectedBranches).toEqual(expected)
    await updateRepositoryRecord('repo', { enabledForReport: false })
    const restored = await readWorkbenchState()
    expect(restored).toMatchObject({
      activeRepositoryId: 'repo',
      myIdentities: identities,
      includeMergeDefault: true,
      repositories: [{ selectedBranches: expected, enabledForReport: false, viewMemory }]
    })
    expect(JSON.parse(await fs.readFile(file, 'utf8')).repositories[0]).not.toHaveProperty(
      'filters'
    )
  }
)
