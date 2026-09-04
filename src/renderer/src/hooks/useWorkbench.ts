import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { App } from 'antd'
import type { TFunction } from 'i18next'
import { useTranslation } from 'react-i18next'
import type {
  AuthorIdentity,
  MultiRepoWeeklyQueryResult,
  ProjectViewMemory,
  RepositoryBranchOverride,
  RepositoryUpdate,
  TimeRangeState,
  WorkbenchState
} from '@shared/models'

export const workbenchKey = ['workbench'] as const
export const weeklyActivityKey = (
  timeRange: TimeRangeState,
  includeMerge?: boolean,
  branchOverride?: RepositoryBranchOverride
) =>
  [
    'weekly-activity',
    timeRange,
    includeMerge,
    branchOverride?.repoId,
    branchOverride?.branch
  ] as const

function localizeMainProcessError(
  error: Error,
  fallback: string,
  language: string,
  t: TFunction
): string {
  const knownErrors: Array<[string, string]> = [
    ['不是有效的 Git 仓库', 'errors.NOT_GIT'],
    ['仓库路径不存在', 'errors.PATH_MISSING'],
    ['未找到系统 Git', 'errors.NO_GIT_BINARY'],
    ['已在列表中', 'errors.DUPLICATE'],
    ['时间范围', 'errors.INVALID_RANGE']
  ]
  const matched = knownErrors.find(([text]) => error.message.includes(text))

  if (matched) return t(matched[1])
  return language.startsWith('zh') && error.message ? error.message : fallback
}

export function useWorkbench(): {
  state: WorkbenchState | undefined
  isLoading: boolean
  addRepository: () => void
  removeRepository: (id: string) => void
  updateRepo: (id: string, partial: RepositoryUpdate) => Promise<void>
  saveProjectView: (id: string, memory: ProjectViewMemory) => Promise<void>
  updateIdentities: (identities: AuthorIdentity[]) => Promise<void>
  updatePreferences: (includeMerge: boolean) => Promise<void>
  refetchWorkbench: () => Promise<unknown>
  adding: boolean
  updating: boolean
} {
  const { message } = App.useApp()
  const queryClient = useQueryClient()
  const { t, i18n } = useTranslation()

  const query = useQuery({
    queryKey: workbenchKey,
    queryFn: () => window.api.getWorkbench()
  })

  const syncState = (state: WorkbenchState): void => {
    queryClient.setQueryData(workbenchKey, state)
    void queryClient.invalidateQueries({ queryKey: ['weekly-activity'] })
  }

  const addMutation = useMutation({
    mutationFn: () => window.api.addRepository(),
    onSuccess: (state) => {
      syncState(state)
      message.success(t('workbench.addSuccess'))
    },
    onError: (error: Error) => {
      message.error(
        localizeMainProcessError(error, t('workbench.addFailed'), i18n.resolvedLanguage ?? '', t)
      )
    }
  })

  const removeMutation = useMutation({
    mutationFn: (id: string) => window.api.removeRepository(id),
    onSuccess: (state) => {
      syncState(state)
      message.success(t('workbench.removeSuccess'))
    },
    onError: (error: Error) => {
      message.error(
        localizeMainProcessError(error, t('workbench.removeFailed'), i18n.resolvedLanguage ?? '', t)
      )
    }
  })

  const updateRepoMutation = useMutation({
    mutationFn: ({ id, partial }: { id: string; partial: RepositoryUpdate }) =>
      window.api.updateRepo(id, partial),
    onSuccess: syncState,
    onError: (error: Error) => {
      message.error(error.message)
    }
  })

  const projectViewMutation = useMutation({
    mutationFn: ({ id, memory }: { id: string; memory: ProjectViewMemory }) =>
      window.api.updateProjectView(id, memory),
    onSuccess: (state) => queryClient.setQueryData(workbenchKey, state),
    onError: (error: Error) => message.error(error.message)
  })

  const updateIdentitiesMutation = useMutation({
    mutationFn: (identities: AuthorIdentity[]) => window.api.updateIdentities(identities),
    onSuccess: syncState,
    onError: (error: Error) => {
      message.error(error.message)
    }
  })

  const updatePreferencesMutation = useMutation({
    mutationFn: (includeMerge: boolean) => window.api.updatePreferences(includeMerge),
    onSuccess: syncState,
    onError: (error: Error) => {
      message.error(error.message)
    }
  })

  return {
    state: query.data,
    isLoading: query.isLoading,
    addRepository: () => addMutation.mutate(),
    removeRepository: (id: string) => removeMutation.mutate(id),
    updateRepo: async (id: string, partial: RepositoryUpdate) => {
      await updateRepoMutation.mutateAsync({ id, partial })
    },
    saveProjectView: async (id: string, memory: ProjectViewMemory) => {
      await projectViewMutation.mutateAsync({ id, memory })
    },
    updateIdentities: async (identities: AuthorIdentity[]) => {
      await updateIdentitiesMutation.mutateAsync(identities)
    },
    updatePreferences: async (includeMerge: boolean) => {
      await updatePreferencesMutation.mutateAsync(includeMerge)
    },
    refetchWorkbench: () => query.refetch(),
    adding: addMutation.isPending,
    updating: updateRepoMutation.isPending || updateIdentitiesMutation.isPending
  }
}

export function useWeeklyActivity(
  timeRange: TimeRangeState,
  overrideIncludeMerge?: boolean,
  branchOverride?: RepositoryBranchOverride
): {
  data: MultiRepoWeeklyQueryResult | undefined
  isFetching: boolean
  isLoading: boolean
  refetch: () => void
  error: Error | null
} {
  const query = useQuery({
    queryKey: weeklyActivityKey(timeRange, overrideIncludeMerge, branchOverride),
    queryFn: () => window.api.queryWeeklyActivity(timeRange, overrideIncludeMerge, branchOverride),
    staleTime: 5000
  })

  return {
    data: query.data,
    isFetching: query.isFetching,
    isLoading: query.isLoading,
    refetch: () => {
      void query.refetch()
    },
    error: query.error as Error | null
  }
}

export function useGitStatus(): {
  status: { ok: boolean; version?: string; error?: string } | undefined
  isLoading: boolean
  refetchStatus: () => Promise<unknown>
} {
  const query = useQuery({
    queryKey: ['app-git-status'],
    queryFn: () => window.api.getGitStatus(),
    staleTime: 30000
  })

  return {
    status: query.data,
    isLoading: query.isLoading,
    refetchStatus: () => query.refetch()
  }
}
