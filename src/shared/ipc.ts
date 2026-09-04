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
  repositoryQuery: 'repository:query',
  repositoryCheckStatus: 'repository:checkStatus',
  repositoryCommitDiff: 'repository:commitDiff',
  weeklyQueryActivity: 'weekly:queryActivity',
  appGetVersion: 'app:getVersion',
  appGetGitStatus: 'app:getGitStatus',
  appCheckForUpdates: 'app:checkForUpdates'
} as const

export type IpcChannel = (typeof IpcChannels)[keyof typeof IpcChannels]
