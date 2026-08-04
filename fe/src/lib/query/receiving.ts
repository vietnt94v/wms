import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type {
  DiscrepancyResolution,
  ReceiptVarianceReasonId,
} from '@/lib/domain/receiving'
import type { ScanLineInput } from '@/lib/domain/scan'
import { createAsn, type CreateAsnPayload } from '@/lib/api/inbound'
import * as api from '@/lib/api/receiving'
import { receivingKeys, receivingSliceKeys, type ReceivingSlice } from './keys'

function useInvalidateReceiving() {
  const queryClient = useQueryClient()
  return (slices: ReceivingSlice[]) => {
    for (const queryKey of receivingSliceKeys(slices)) {
      void queryClient.invalidateQueries({ queryKey })
    }
  }
}

export function useSuppliers() {
  return useQuery({
    queryKey: receivingKeys.suppliers(),
    queryFn: api.listSuppliers,
  })
}

export function useProducts() {
  return useQuery({
    queryKey: receivingKeys.products(),
    queryFn: api.listProducts,
  })
}

export function useAsns() {
  return useQuery({
    queryKey: receivingKeys.asns(),
    queryFn: api.listAsns,
  })
}

export function useDocks() {
  return useQuery({
    queryKey: receivingKeys.docks(),
    queryFn: api.listDocks,
  })
}

export function useAppointments() {
  return useQuery({
    queryKey: receivingKeys.appointments(),
    queryFn: api.listAppointments,
  })
}

export function useSessions() {
  return useQuery({
    queryKey: receivingKeys.sessions(),
    queryFn: api.listSessions,
  })
}

export function useDiscrepancies() {
  return useQuery({
    queryKey: receivingKeys.discrepancies(),
    queryFn: api.listDiscrepancies,
  })
}

export function useQcResults() {
  return useQuery({
    queryKey: receivingKeys.qcResults(),
    queryFn: api.listQcResults,
  })
}

export function usePutawayTasks() {
  return useQuery({
    queryKey: receivingKeys.putawayTasks(),
    queryFn: api.listPutawayTasks,
  })
}

export function useInventory() {
  return useQuery({
    queryKey: receivingKeys.inventory(),
    queryFn: api.listInventory,
  })
}

export function useCreateAsnMutation() {
  const invalidate = useInvalidateReceiving()
  return useMutation({
    mutationFn: (payload: CreateAsnPayload) => createAsn(payload),
    onSuccess: () => invalidate(['asns']),
  })
}

export function useScheduleAppointmentMutation() {
  const invalidate = useInvalidateReceiving()
  return useMutation({
    mutationFn: api.scheduleAppointment,
    onSuccess: (result) => {
      if (result.ok) invalidate(['appointments', 'asns'])
    },
  })
}

export function useGateInMutation() {
  const invalidate = useInvalidateReceiving()
  return useMutation({
    mutationFn: api.gateIn,
    onSuccess: (result) => {
      if (result.ok) {
        invalidate(['sessions', 'asns', 'docks', 'appointments'])
      }
    },
  })
}

export function useRejectArrivalMutation() {
  const invalidate = useInvalidateReceiving()
  return useMutation({
    mutationFn: ({ sessionId, reason }: { sessionId: string; reason: string }) =>
      api.rejectArrival(sessionId, reason),
    onSuccess: () => invalidate(['sessions', 'asns', 'docks']),
  })
}

export function useApproveUnknownArrivalMutation() {
  const invalidate = useInvalidateReceiving()
  return useMutation({
    mutationFn: (sessionId: string) => api.approveUnknownArrival(sessionId),
    onSuccess: () => invalidate(['sessions', 'asns']),
  })
}

export function useStartUnloadMutation() {
  const invalidate = useInvalidateReceiving()
  return useMutation({
    mutationFn: (sessionId: string) => api.startUnload(sessionId),
    onSuccess: () => invalidate(['sessions']),
  })
}

export function useStartReceivingMutation() {
  const invalidate = useInvalidateReceiving()
  return useMutation({
    mutationFn: (sessionId: string) => api.startReceiving(sessionId),
    onSuccess: () => invalidate(['sessions']),
  })
}

export function useScanMutation() {
  const invalidate = useInvalidateReceiving()
  return useMutation({
    mutationFn: ({
      sessionId,
      ...body
    }: {
      sessionId: string
      code: string
      lot?: string
      expiry?: string
      qty?: number
      lines?: ScanLineInput[]
      varianceReason?: string
      varianceReasonId?: ReceiptVarianceReasonId
      confirm?: boolean
      allowOverOverride?: boolean
    }) => api.scan(sessionId, body),
    onSuccess: (_event, variables) => {
      if (variables.confirm) invalidate(['sessions', 'asns'])
    },
  })
}

export function useFinishReceivingMutation() {
  const invalidate = useInvalidateReceiving()
  return useMutation({
    mutationFn: (sessionId: string) => api.finishReceiving(sessionId),
    onSuccess: (result) => {
      if (result.ok) invalidate(['sessions', 'asns', 'discrepancies'])
    },
  })
}

export function useSubmitQcMutation() {
  const invalidate = useInvalidateReceiving()
  return useMutation({
    mutationFn: ({
      sessionId,
      ...body
    }: {
      sessionId: string
      sku: string
      sampleQty: number
      pass: boolean
      reason?: string
    }) => api.submitQc(sessionId, body),
    onSuccess: (result) => {
      if (result.ok) invalidate(['qcResults', 'sessions'])
    },
  })
}

export function useResolveDiscrepancyMutation() {
  const invalidate = useInvalidateReceiving()
  return useMutation({
    mutationFn: ({
      id,
      resolution,
      note,
    }: {
      id: string
      resolution: DiscrepancyResolution
      note?: string
    }) => api.resolveDiscrepancy(id, resolution, note),
    onSuccess: () => invalidate(['discrepancies']),
  })
}

export function useGeneratePutawayTasksMutation() {
  const invalidate = useInvalidateReceiving()
  return useMutation({
    mutationFn: (sessionId: string) => api.generatePutawayTasks(sessionId),
    onSuccess: () => invalidate(['putawayTasks', 'sessions', 'asns']),
  })
}

export function useConfirmPutawayMutation() {
  const queryClient = useQueryClient()
  const invalidate = useInvalidateReceiving()
  return useMutation({
    mutationFn: (taskId: string) => api.confirmPutaway(taskId),
    onSuccess: async (_result, taskId) => {
      const tasksBefore = queryClient.getQueryData<Awaited<
        ReturnType<typeof api.listPutawayTasks>
      >>(receivingKeys.putawayTasks())
      const task = tasksBefore?.find((t) => t.id === taskId)
      const sessionId = task?.sessionId

      invalidate(['putawayTasks', 'inventory', 'sessions'])

      if (sessionId === undefined) return

      const updatedTasks = await queryClient.fetchQuery({
        queryKey: receivingKeys.putawayTasks(),
        queryFn: api.listPutawayTasks,
      })

      const sessionComplete = updatedTasks
        .filter((t) => t.sessionId === sessionId)
        .every((t) => t.status === 'CONFIRMED')

      if (sessionComplete) {
        invalidate(['asns', 'docks'])
      }
    },
  })
}
