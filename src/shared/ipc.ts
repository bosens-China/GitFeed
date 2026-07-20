export const IpcChannels = {
  workbenchGet: 'workbench:get',
  workbenchAdd: 'workbench:add',
  workbenchRemove: 'workbench:remove',
  workbenchSetActive: 'workbench:setActive',
  workbenchUpdateFilters: 'workbench:updateFilters',
  repositoryQuery: 'repository:query'
} as const

export type IpcChannel = (typeof IpcChannels)[keyof typeof IpcChannels]
