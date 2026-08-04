import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import * as api from '@/lib/api/putaway'
import { putawayKeys, receivingKeys } from './keys'

export function usePutawayTasks(status?: string) {
  return useQuery({
    queryKey: putawayKeys.tasks(status),
    queryFn: () => api.listPutawayTasks(status),
  })
}

export function useConfirmPutawayMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      taskId,
      code,
    }: {
      taskId: string
      code: string
    }) => api.confirmPutaway(taskId, code),
    onSuccess: async (result, variables) => {
      await queryClient.invalidateQueries({ queryKey: putawayKeys.all })
      await queryClient.invalidateQueries({
        queryKey: receivingKeys.inventory(),
      })
      await queryClient.invalidateQueries({
        queryKey: receivingKeys.sessions(),
      })

      if (result.ok) {
        const tasks = await queryClient.fetchQuery({
          queryKey: putawayKeys.tasks(),
          queryFn: () => api.listPutawayTasks(),
        })
        const task = tasks.find((t) => t.id === variables.taskId)
        if (!task) return
        const sessionComplete = tasks
          .filter((t) => t.sessionId === task.sessionId)
          .every((t) => t.status === 'CONFIRMED')
        if (sessionComplete) {
          await queryClient.invalidateQueries({
            queryKey: receivingKeys.asns(),
          })
          await queryClient.invalidateQueries({
            queryKey: receivingKeys.docks(),
          })
        }
      }
    },
  })
}
