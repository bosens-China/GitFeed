import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'
import { IpcChannels } from '@shared/ipc'
import type { RepositoryFilters, RepositoryQueryResult, WorkbenchState } from '@shared/models'

const api = {
  getWorkbench: (): Promise<WorkbenchState> => ipcRenderer.invoke(IpcChannels.workbenchGet),
  addRepository: (): Promise<WorkbenchState> => ipcRenderer.invoke(IpcChannels.workbenchAdd),
  removeRepository: (id: string): Promise<WorkbenchState> =>
    ipcRenderer.invoke(IpcChannels.workbenchRemove, id),
  setActiveRepository: (id: string | null): Promise<WorkbenchState> =>
    ipcRenderer.invoke(IpcChannels.workbenchSetActive, id),
  updateFilters: (id: string, filters: RepositoryFilters): Promise<WorkbenchState> =>
    ipcRenderer.invoke(IpcChannels.workbenchUpdateFilters, id, filters),
  queryRepository: (id: string): Promise<RepositoryQueryResult> =>
    ipcRenderer.invoke(IpcChannels.repositoryQuery, id)
}

export type GitFeedApi = typeof api

if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore (define in dts)
  window.electron = electronAPI
  // @ts-ignore (define in dts)
  window.api = api
}
