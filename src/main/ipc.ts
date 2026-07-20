import { BrowserWindow, dialog, ipcMain } from 'electron'
import { IpcChannels } from '@shared/ipc'
import { createDefaultFilters, type RepositoryFilters, type WorkbenchState } from '@shared/models'
import { queryRepository } from './git/query'
import { GitCommandError } from './git/run'
import { assertGitRepository, repositoryDisplayName } from './git/repository'
import {
  addRepositoryRecord,
  readWorkbenchState,
  reconcileRepositoryFilters,
  removeRepositoryRecord,
  setActiveRepository,
  updateRepositoryFilters
} from './store/workbench'

export function registerIpcHandlers(): void {
  ipcMain.handle(IpcChannels.workbenchGet, async (): Promise<WorkbenchState> => {
    return readWorkbenchState()
  })

  ipcMain.handle(IpcChannels.workbenchAdd, async (): Promise<WorkbenchState> => {
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
      const head = await queryRepository(repoPath, createDefaultFilters())
      const branch = head.ok && head.resolvedBranch ? head.resolvedBranch : null

      return await addRepositoryRecord({
        id: repoPath,
        path: repoPath,
        name: repositoryDisplayName(repoPath),
        filters: {
          ...createDefaultFilters(),
          branch
        }
      })
    } catch (error) {
      if (error instanceof GitCommandError) {
        throw new Error(error.message)
      }
      const code = (error as { code?: string }).code
      if (code === 'DUPLICATE') {
        throw new Error('该仓库已在工作台中')
      }
      if (code === 'PATH_MISSING') {
        throw new Error('仓库路径不存在或不可访问')
      }
      if (code === 'NOT_GIT') {
        throw new Error('所选目录不是有效的 Git 仓库')
      }
      throw new Error(error instanceof Error ? error.message : '添加仓库失败')
    }
  })

  ipcMain.handle(
    IpcChannels.workbenchRemove,
    async (_event, id: string): Promise<WorkbenchState> => {
      return removeRepositoryRecord(id)
    }
  )

  ipcMain.handle(
    IpcChannels.workbenchSetActive,
    async (_event, id: string | null): Promise<WorkbenchState> => {
      return setActiveRepository(id)
    }
  )

  ipcMain.handle(
    IpcChannels.workbenchUpdateFilters,
    async (_event, id: string, filters: RepositoryFilters): Promise<WorkbenchState> => {
      return updateRepositoryFilters(id, filters)
    }
  )

  ipcMain.handle(IpcChannels.repositoryQuery, async (_event, id: string) => {
    const state = await readWorkbenchState()
    const repo = state.repositories.find((item) => item.id === id)
    if (!repo) {
      return {
        ok: false as const,
        code: 'UNKNOWN' as const,
        error: '仓库不存在'
      }
    }
    const result = await queryRepository(repo.path, repo.filters)
    if (result.ok) {
      const filters = {
        ...repo.filters,
        branch: result.resolvedBranch,
        authors: result.authorsFilter
      }
      if (JSON.stringify(filters) !== JSON.stringify(repo.filters)) {
        await reconcileRepositoryFilters(repo.id, repo.filters, filters)
      }
    }
    return result
  })
}
