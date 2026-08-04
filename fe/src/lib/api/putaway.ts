import type {
  ConfirmPutawayResult,
  PutawayTask,
} from '@/lib/domain/putaway'
import { apiClient } from './client'

export async function listPutawayTasks(status?: string): Promise<PutawayTask[]> {
  const { data } = await apiClient.get<PutawayTask[]>('/putaway/tasks', {
    params: status ? { status } : undefined,
  })
  return data
}

export async function getPutawayTask(id: string): Promise<PutawayTask> {
  const { data } = await apiClient.get<PutawayTask>(`/putaway/tasks/${id}`)
  return data
}

export async function confirmPutaway(
  taskId: string,
  code: string,
): Promise<ConfirmPutawayResult> {
  const { data } = await apiClient.post<ConfirmPutawayResult>(
    `/putaway/tasks/${taskId}/confirm`,
    { code },
  )
  return data
}
