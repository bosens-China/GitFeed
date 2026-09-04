import { app, BrowserWindow, dialog, ipcMain, type IpcMainInvokeEvent } from 'electron'
import { IpcChannels, type IpcChannel } from '@shared/ipc'
import {
  createDefaultFilters,
  type AuthorIdentity,
  type MultiRepoWeeklyQueryResult,
  type RepositoryBranchOverride,
  type RepositoryUpdate,
  type TimeRangePreset,
  type TimeRangeState,
  type WorkbenchState
} from '@shared/models'
import {
  diagnoseRepository,
  discoverRepoAuthors,
  queryMultiRepoCommits,
  queryRepository
} from './git/query'
import { GitCommandError, runGit } from './git/run'
import { assertGitRepository, repositoryDisplayName, resolveBranchFallback } from './git/repository'
import { checkForUpdates } from './update'
import {
  addRepositoryRecord,
  readWorkbenchState,
  removeRepositoryRecord,
  setActiveRepository,
  updateIncludeMergeDefault,
  updateMyIdentities,
  updateRepositoryRecord
} from './store/workbench'

const TIME_RANGE_PRESETS = new Set<TimeRangePreset>([
  'thisWeek',
  'lastWeek',
  'thisMonth',
  'lastMonth',
  'custom'
])

function registerHandler<Args extends unknown[], Result>(
  channel: IpcChannel,
  listener: (...args: Args) => Result | Promise<Result>
): void {
  ipcMain.handle(channel, (event: IpcMainInvokeEvent, ...args: unknown[]) => {
    const ownerWindow = BrowserWindow.fromWebContents(event.sender)
    if (!ownerWindow || event.senderFrame !== event.sender.mainFrame) {
      throw new Error('拒绝来自非受信任页面的请求')
    }
    return listener(...(args as Args))
  })
}

function parseString(value: unknown, label: string, maxLength = 4096): string {
  if (typeof value !== 'string' || !value.trim() || value.length > maxLength) {
    throw new Error(`${label}无效`)
  }
  return value
}

function parseRepositoryUpdate(value: unknown): RepositoryUpdate {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('工程配置无效')
  }

  const input = value as Record<string, unknown>
  const update: RepositoryUpdate = {}

  if ('name' in input) {
    update.name = parseString(input.name, '工程名称', 200).trim()
  }
  if ('enabledForReport' in input) {
    if (typeof input.enabledForReport !== 'boolean') {
      throw new Error('周报参与状态无效')
    }
    update.enabledForReport = input.enabledForReport
  }
  if ('selectedBranches' in input) {
    if (
      !Array.isArray(input.selectedBranches) ||
      input.selectedBranches.length > 100 ||
      !input.selectedBranches.every(
        (branch) => typeof branch === 'string' && branch.trim() && branch.length <= 255
      )
    ) {
      throw new Error('分支列表无效')
    }
    update.selectedBranches = [...new Set(input.selectedBranches.map((branch) => branch.trim()))]
  }

  if (Object.keys(update).length === 0) {
    throw new Error('没有可更新的工程配置')
  }
  return update
}

function parseIdentities(value: unknown): AuthorIdentity[] {
  if (!Array.isArray(value) || value.length > 100) {
    throw new Error('作者身份列表无效')
  }
  return value.map((item) => {
    if (!item || typeof item !== 'object' || Array.isArray(item)) {
      throw new Error('作者身份无效')
    }
    const identity = item as Record<string, unknown>
    return {
      name: parseString(identity.name, '作者姓名', 200).trim(),
      email: parseString(identity.email, '作者邮箱', 320).trim()
    }
  })
}

function parseTimeRange(value: unknown): TimeRangeState {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('时间范围无效')
  }
  const input = value as Record<string, unknown>
  if (
    typeof input.preset !== 'string' ||
    !TIME_RANGE_PRESETS.has(input.preset as TimeRangePreset)
  ) {
    throw new Error('时间范围类型无效')
  }

  if (input.preset === 'custom') {
    return {
      preset: 'custom',
      customStart: parseString(input.customStart, '开始时间', 100),
      customEnd: parseString(input.customEnd, '结束时间', 100)
    }
  }
  return { preset: input.preset as TimeRangePreset }
}

function parseBranchOverride(value: unknown): RepositoryBranchOverride | undefined {
  if (value === undefined) return undefined
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('临时分支查询参数无效')
  }

  const input = value as Record<string, unknown>
  return {
    repoId: parseString(input.repoId, '工程标识'),
    branch: parseString(input.branch, '分支名称', 255).trim()
  }
}

export function registerIpcHandlers(): void {
  registerHandler(IpcChannels.workbenchGet, async (): Promise<WorkbenchState> => {
    return readWorkbenchState()
  })

  registerHandler(IpcChannels.workbenchAdd, async (): Promise<WorkbenchState> => {
    const window = BrowserWindow.getFocusedWindow()
    const dialogOptions = {
      title: '添加 Git 仓库',
      properties: ['openDirectory' as const]
    }
    const result = window
      ? await dialog.showOpenDialog(window, dialogOptions)
      : await dialog.showOpenDialog(dialogOptions)

    if (result.canceled || result.filePaths.length === 0) {
      return readWorkbenchState()
    }

    try {
      const repoPath = await assertGitRepository(result.filePaths[0])
      const diagnosis = await diagnoseRepository(repoPath)
      const { branch: defaultBranch } = resolveBranchFallback(
        null,
        diagnosis.branches,
        diagnosis.headBranch,
        diagnosis.headBranch === null
      )

      return await addRepositoryRecord({
        id: repoPath,
        path: repoPath,
        name: repositoryDisplayName(repoPath),
        enabledForReport: true,
        selectedBranches: defaultBranch ? [defaultBranch] : [],
        availableBranches: diagnosis.branches,
        status: diagnosis.status,
        lastCheckedAt: new Date().toISOString(),
        filters: {
          ...createDefaultFilters(),
          branch: defaultBranch
        }
      })
    } catch (error) {
      if (error instanceof GitCommandError) throw new Error(error.message)
      const code = (error as { code?: string }).code
      if (code === 'DUPLICATE') throw new Error('该仓库已在工作台中')
      if (code === 'PATH_MISSING') throw new Error('仓库路径不存在或不可访问')
      if (code === 'NOT_GIT') throw new Error('所选目录不是有效的 Git 仓库')
      throw new Error(error instanceof Error ? error.message : '添加仓库失败')
    }
  })

  registerHandler(IpcChannels.workbenchRemove, async (id: unknown): Promise<WorkbenchState> => {
    return removeRepositoryRecord(parseString(id, '工程标识'))
  })

  registerHandler(IpcChannels.workbenchSetActive, async (id: unknown): Promise<WorkbenchState> => {
    return setActiveRepository(id === null ? null : parseString(id, '工程标识'))
  })

  registerHandler(
    IpcChannels.workbenchUpdateRepo,
    async (id: unknown, update: unknown): Promise<WorkbenchState> => {
      return updateRepositoryRecord(parseString(id, '工程标识'), parseRepositoryUpdate(update))
    }
  )

  registerHandler(
    IpcChannels.workbenchUpdateIdentities,
    async (identities: unknown): Promise<WorkbenchState> => {
      return updateMyIdentities(parseIdentities(identities))
    }
  )

  registerHandler(
    IpcChannels.workbenchUpdatePreferences,
    async (includeMergeDefault: unknown): Promise<WorkbenchState> => {
      if (typeof includeMergeDefault !== 'boolean') throw new Error('Merge 偏好无效')
      return updateIncludeMergeDefault(includeMergeDefault)
    }
  )

  registerHandler(IpcChannels.workbenchDiscoverAuthors, async (): Promise<AuthorIdentity[]> => {
    const state = await readWorkbenchState()
    const allAuthorsMap = new Map<string, AuthorIdentity>()
    for (const repo of state.repositories) {
      const authors = await discoverRepoAuthors(repo.path)
      for (const author of authors) {
        const key = `${author.name.trim().toLowerCase()}\u0000${author.email.trim().toLowerCase()}`
        if (!allAuthorsMap.has(key)) allAuthorsMap.set(key, author)
      }
    }
    return Array.from(allAuthorsMap.values()).sort((a, b) => a.name.localeCompare(b.name))
  })

  registerHandler(IpcChannels.repositoryQuery, async (id: unknown) => {
    const parsedId = parseString(id, '工程标识')
    const state = await readWorkbenchState()
    const repo = state.repositories.find((item) => item.id === parsedId)
    if (!repo) {
      return { ok: false as const, code: 'UNKNOWN' as const, error: '仓库不存在' }
    }
    return queryRepository(repo.path, repo.filters)
  })

  registerHandler(IpcChannels.repositoryCheckStatus, async (id: unknown) => {
    const parsedId = parseString(id, '工程标识')
    const state = await readWorkbenchState()
    const repo = state.repositories.find((item) => item.id === parsedId)
    if (!repo) throw new Error('仓库不存在')

    const diagnosis = await diagnoseRepository(repo.path)
    await updateRepositoryRecord(parsedId, {
      availableBranches: diagnosis.branches,
      status: diagnosis.status,
      lastCheckedAt: new Date().toISOString(),
      errorMessage: diagnosis.error
    })
    return diagnosis
  })

  registerHandler(
    IpcChannels.weeklyQueryActivity,
    async (
      timeRangeState: unknown,
      overrideIncludeMerge?: unknown,
      branchOverride?: unknown
    ): Promise<MultiRepoWeeklyQueryResult> => {
      if (overrideIncludeMerge !== undefined && typeof overrideIncludeMerge !== 'boolean') {
        throw new Error('Merge 查询参数无效')
      }
      const state = await readWorkbenchState()
      const includeMerge =
        typeof overrideIncludeMerge === 'boolean' ? overrideIncludeMerge : state.includeMergeDefault
      const parsedBranchOverride = parseBranchOverride(branchOverride)
      if (
        parsedBranchOverride &&
        !state.repositories.some((repo) => repo.id === parsedBranchOverride.repoId)
      ) {
        throw new Error('工程不存在')
      }
      return queryMultiRepoCommits({
        repos: state.repositories,
        myIdentities: state.myIdentities,
        timeRangeState: parseTimeRange(timeRangeState),
        includeMerge,
        branchOverride: parsedBranchOverride
      })
    }
  )

  registerHandler(
    IpcChannels.appGetGitStatus,
    async (): Promise<{ ok: boolean; version?: string; error?: string }> => {
      try {
        const { stdout } = await runGit(process.cwd(), ['--version'])
        return { ok: true, version: stdout.trim() }
      } catch (error) {
        return {
          ok: false,
          error: error instanceof Error ? error.message : 'Git 检测失败'
        }
      }
    }
  )

  registerHandler(IpcChannels.appCheckForUpdates, async () => {
    return checkForUpdates(app.getVersion())
  })
}
