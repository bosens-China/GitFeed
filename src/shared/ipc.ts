export const IpcChannels = {
  workbenchGet: 'workbench:get',
  workbenchAdd: 'workbench:add',
  workbenchRemove: 'workbench:remove',
  workbenchSetActive: 'workbench:setActive',
  workbenchUpdateRepo: 'workbench:updateRepo',
  workbenchUpdateIdentities: 'workbench:updateIdentities',
  workbenchUpdatePreferences: 'workbench:updatePreferences',
  workbenchDiscoverAuthors: 'workbench:discoverAuthors',
  repositoryQuery: 'repository:query',
  repositoryCheckStatus: 'repository:checkStatus',
  weeklyQueryActivity: 'weekly:queryActivity',
  appGetGitStatus: 'app:getGitStatus',
  appCheckForUpdates: 'app:checkForUpdates'
} as const

export type IpcChannel = (typeof IpcChannels)[keyof typeof IpcChannels]
