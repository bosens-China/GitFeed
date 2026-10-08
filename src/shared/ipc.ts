export const IpcChannels = {
  workbenchGet: 'workbench:get',
  workbenchAdd: 'workbench:add',
  workbenchRemove: 'workbench:remove',
  workbenchSetActive: 'workbench:setActive',
  workbenchUpdateRepo: 'workbench:updateRepo',
  workbenchUpdateProjectView: 'workbench:updateProjectView',
  workbenchUpdateIdentities: 'workbench:updateIdentities',
  workbenchUpdatePreferences: 'workbench:updatePreferences',
  workbenchDiscoverAuthors: 'workbench:discoverAuthors',
  repositoryCheckStatus: 'repository:checkStatus',
  repositoryCommitDiff: 'repository:commitDiff',
  weeklyQueryActivity: 'weekly:queryActivity',
  appGetVersion: 'app:getVersion',
  appGetGitStatus: 'app:getGitStatus',
  appCheckForUpdates: 'app:checkForUpdates',
  holidaysGetStatus: 'holidays:getStatus',
  holidaysGetCalendar: 'holidays:getCalendar',
  holidaysSetAutoUpdate: 'holidays:setAutoUpdate',
  holidaysCheck: 'holidays:check'
} as const

export type IpcChannel = (typeof IpcChannels)[keyof typeof IpcChannels]
