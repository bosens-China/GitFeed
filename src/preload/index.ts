import { contextBridge, ipcRenderer } from 'electron'
import { IpcChannels } from '@shared/ipc'
import type {
  AuthorIdentity,
  CommitDiffResult,
  MultiRepoWeeklyQueryResult,
  ProjectViewMemory,
  RepositoryBranchOverride,
  RepositoryQueryResult,
  RepositoryUpdate,
  TimeRangeState,
  WorkbenchState
} from '@shared/models'
import type { UpdateCheckResult } from '@shared/update'

const api = {
  platform: process.platform,
  getWorkbench: (): Promise<WorkbenchState> => ipcRenderer.invoke(IpcChannels.workbenchGet),
  addRepository: (): Promise<WorkbenchState> => ipcRenderer.invoke(IpcChannels.workbenchAdd),
  removeRepository: (id: string): Promise<WorkbenchState> =>
    ipcRenderer.invoke(IpcChannels.workbenchRemove, id),
  setActiveRepository: (id: string | null): Promise<WorkbenchState> =>
    ipcRenderer.invoke(IpcChannels.workbenchSetActive, id),
  updateRepo: (id: string, partial: RepositoryUpdate): Promise<WorkbenchState> =>
    ipcRenderer.invoke(IpcChannels.workbenchUpdateRepo, id, partial),
  updateProjectView: (id: string, memory: ProjectViewMemory): Promise<WorkbenchState> =>
    ipcRenderer.invoke(IpcChannels.workbenchUpdateProjectView, id, memory),
  updateIdentities: (identities: AuthorIdentity[]): Promise<WorkbenchState> =>
    ipcRenderer.invoke(IpcChannels.workbenchUpdateIdentities, identities),
  updatePreferences: (includeMergeDefault: boolean): Promise<WorkbenchState> =>
    ipcRenderer.invoke(IpcChannels.workbenchUpdatePreferences, includeMergeDefault),
  discoverAuthors: (): Promise<AuthorIdentity[]> =>
    ipcRenderer.invoke(IpcChannels.workbenchDiscoverAuthors),
  queryRepository: (id: string): Promise<RepositoryQueryResult> =>
    ipcRenderer.invoke(IpcChannels.repositoryQuery, id),
  checkRepoStatus: (id: string) => ipcRenderer.invoke(IpcChannels.repositoryCheckStatus, id),
  getCommitDiff: (id: string, hash: string): Promise<CommitDiffResult> =>
    ipcRenderer.invoke(IpcChannels.repositoryCommitDiff, id, hash),
  queryWeeklyActivity: (
    timeRange: TimeRangeState,
    overrideIncludeMerge?: boolean,
    branchOverride?: RepositoryBranchOverride
  ): Promise<MultiRepoWeeklyQueryResult> =>
    ipcRenderer.invoke(
      IpcChannels.weeklyQueryActivity,
      timeRange,
      overrideIncludeMerge,
      branchOverride
    ),
  getAppVersion: (): Promise<string> => ipcRenderer.invoke(IpcChannels.appGetVersion),
  getGitStatus: (): Promise<{ ok: boolean; version?: string; error?: string }> =>
    ipcRenderer.invoke(IpcChannels.appGetGitStatus),
  checkForUpdates: (): Promise<UpdateCheckResult> =>
    ipcRenderer.invoke(IpcChannels.appCheckForUpdates)
}

export type GitFeedApi = typeof api

if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore (define in dts)
  window.api = api
}
