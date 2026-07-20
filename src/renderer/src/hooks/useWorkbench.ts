import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { App } from 'antd'
import type { RepositoryFilters, WorkbenchState } from '@shared/models'

const workbenchKey = ['workbench'] as const

export function useWorkbench(): {
  state: WorkbenchState | undefined
  isLoading: boolean
  addRepository: () => void
  removeRepository: (id: string) => void
  setActiveRepository: (id: string | null) => void
  updateFilters: (id: string, filters: RepositoryFilters) => Promise<void>
  adding: boolean
  updatingFilters: boolean
} {
  const { message } = App.useApp()
  const queryClient = useQueryClient()

  const query = useQuery({
    queryKey: workbenchKey,
    queryFn: () => window.api.getWorkbench()
  })

  const syncState = (state: WorkbenchState): void => {
    queryClient.setQueryData(workbenchKey, state)
  }

  const addMutation = useMutation({
    mutationFn: () => window.api.addRepository(),
    onSuccess: (state) => {
      syncState(state)
      message.success('已添加仓库')
    },
    onError: (error: Error) => {
      message.error(error.message || '添加仓库失败')
    }
  })

  const removeMutation = useMutation({
    mutationFn: (id: string) => window.api.removeRepository(id),
    onSuccess: (state) => {
      syncState(state)
      message.success('已从工作台移除（本地仓库未删除）')
    },
    onError: (error: Error) => {
      message.error(error.message || '移除失败')
    }
  })

  const activeMutation = useMutation({
    mutationFn: (id: string | null) => window.api.setActiveRepository(id),
    onSuccess: syncState,
    onError: (error: Error) => {
      message.error(error.message || '切换仓库失败')
    }
  })

  const filtersMutation = useMutation({
    mutationFn: ({ id, filters }: { id: string; filters: RepositoryFilters }) =>
      window.api.updateFilters(id, filters),
    onSuccess: syncState,
    onError: (error: Error) => {
      message.error(error.message || '保存筛选失败')
    }
  })

  return {
    state: query.data,
    isLoading: query.isLoading,
    addRepository: () => addMutation.mutate(),
    removeRepository: (id) => removeMutation.mutate(id),
    setActiveRepository: (id) => activeMutation.mutate(id),
    updateFilters: async (id, filters) => {
      await filtersMutation.mutateAsync({ id, filters })
    },
    adding: addMutation.isPending,
    updatingFilters: filtersMutation.isPending
  }
}

export function useRepositoryQuery(repositoryId: string | null | undefined): {
  data: Awaited<ReturnType<typeof window.api.queryRepository>> | undefined
  isFetching: boolean
  isLoading: boolean
  refetch: () => void
  errorMessage: string | null
} {
  const query = useQuery({
    queryKey: ['repository', repositoryId],
    enabled: Boolean(repositoryId),
    queryFn: () => window.api.queryRepository(repositoryId!),
    staleTime: 0
  })

  const data = query.data
  const errorMessage =
    data && !data.ok ? data.error : query.error instanceof Error ? query.error.message : null

  return {
    data,
    isFetching: query.isFetching,
    isLoading: query.isLoading,
    refetch: () => {
      void query.refetch()
    },
    errorMessage
  }
}
