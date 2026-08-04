import { create } from 'zustand'
import type {
  ASN,
  Appointment,
  Discrepancy,
  DiscrepancyResolution,
  Dock,
  InventoryRecord,
  Product,
  PutawayTask,
  QCResult,
  ReceiptVarianceReasonId,
  ReceivingSession,
  ScanEvent,
  Supplier,
} from '@/lib/domain/receiving'
import type { ScanLineInput } from '@/lib/domain/scan'
import * as api from '@/lib/api/receiving'
import { createAsn, type CreateAsnPayload } from '@/lib/api/inbound'

export type ReceivingSlice =
  | 'asns'
  | 'docks'
  | 'appointments'
  | 'sessions'
  | 'discrepancies'
  | 'qcResults'
  | 'putawayTasks'
  | 'inventory'

const sliceFetchers: Record<
  ReceivingSlice,
  () => Promise<
    | ASN[]
    | Dock[]
    | Appointment[]
    | ReceivingSession[]
    | Discrepancy[]
    | QCResult[]
    | PutawayTask[]
    | InventoryRecord[]
  >
> = {
  asns: api.listAsns,
  docks: api.listDocks,
  appointments: api.listAppointments,
  sessions: api.listSessions,
  discrepancies: api.listDiscrepancies,
  qcResults: api.listQcResults,
  putawayTasks: api.listPutawayTasks,
  inventory: api.listInventory,
}

interface ReceivingState {
  suppliers: Supplier[]
  products: Product[]
  asns: ASN[]
  docks: Dock[]
  appointments: Appointment[]
  sessions: ReceivingSession[]
  discrepancies: Discrepancy[]
  qcResults: QCResult[]
  putawayTasks: PutawayTask[]
  inventory: InventoryRecord[]
  loaded: boolean
  loading: boolean

  loadAll: () => Promise<void>
  refreshSlices: (slices: ReceivingSlice[]) => Promise<void>

  createAsn: (payload: CreateAsnPayload) => Promise<ASN>

  scheduleAppointment: (input: {
    asnId: string
    dockId: string
    windowStart: string
    windowEnd: string
  }) => Promise<{ ok: boolean; message: string; appointmentId?: string }>

  gateIn: (input: {
    appointmentId?: string
    asnId?: string
    dockId: string
  }) => Promise<{
    ok: boolean
    message: string
    sessionId?: string
    unknownArrival?: boolean
  }>

  rejectArrival: (sessionId: string, reason: string) => Promise<void>
  approveUnknownArrival: (sessionId: string) => Promise<void>
  startUnload: (sessionId: string) => Promise<void>
  startReceiving: (sessionId: string) => Promise<void>

  scan: (input: {
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
  }) => Promise<ScanEvent>

  finishReceiving: (
    sessionId: string,
  ) => Promise<{ ok: boolean; message: string }>
  submitQc: (input: {
    sessionId: string
    sku: string
    sampleQty: number
    pass: boolean
    reason?: string
  }) => Promise<{ ok: boolean; message: string }>
  resolveDiscrepancy: (
    id: string,
    resolution: DiscrepancyResolution,
    note?: string,
  ) => Promise<void>
  generatePutawayTasks: (sessionId: string) => Promise<void>
  confirmPutaway: (taskId: string) => Promise<void>
}

export const useReceivingStore = create<ReceivingState>((set, get) => ({
  suppliers: [],
  products: [],
  asns: [],
  docks: [],
  appointments: [],
  sessions: [],
  discrepancies: [],
  qcResults: [],
  putawayTasks: [],
  inventory: [],
  loaded: false,
  loading: false,

  loadAll: async () => {
    if (get().loading) return
    set({ loading: true })
    try {
      const [
        suppliers,
        products,
        asns,
        docks,
        appointments,
        sessions,
        discrepancies,
        qcResults,
        putawayTasks,
        inventory,
      ] = await Promise.all([
        api.listSuppliers(),
        api.listProducts(),
        api.listAsns(),
        api.listDocks(),
        api.listAppointments(),
        api.listSessions(),
        api.listDiscrepancies(),
        api.listQcResults(),
        api.listPutawayTasks(),
        api.listInventory(),
      ])
      set({
        suppliers,
        products,
        asns,
        docks,
        appointments,
        sessions,
        discrepancies,
        qcResults,
        putawayTasks,
        inventory,
        loaded: true,
        loading: false,
      })
    } catch (error) {
      set({ loading: false })
      throw error
    }
  },

  refreshSlices: async (slices) => {
    const unique = [...new Set(slices)]
    if (unique.length === 0) return
    const results = await Promise.all(unique.map((slice) => sliceFetchers[slice]()))
    set(
      Object.fromEntries(unique.map((slice, index) => [slice, results[index]])),
    )
  },

  createAsn: async (payload) => {
    const asn = await createAsn(payload)
    await get().refreshSlices(['asns'])
    return asn
  },

  scheduleAppointment: async (input) => {
    const result = await api.scheduleAppointment(input)
    if (result.ok) await get().refreshSlices(['appointments', 'asns'])
    return result
  },

  gateIn: async (input) => {
    const result = await api.gateIn(input)
    if (result.ok) {
      await get().refreshSlices(['sessions', 'asns', 'docks', 'appointments'])
    }
    return result
  },

  rejectArrival: async (sessionId, reason) => {
    await api.rejectArrival(sessionId, reason)
    await get().refreshSlices(['sessions', 'asns', 'docks'])
  },

  approveUnknownArrival: async (sessionId) => {
    await api.approveUnknownArrival(sessionId)
    await get().refreshSlices(['sessions', 'asns'])
  },

  startUnload: async (sessionId) => {
    await api.startUnload(sessionId)
    await get().refreshSlices(['sessions'])
  },

  startReceiving: async (sessionId) => {
    await api.startReceiving(sessionId)
    await get().refreshSlices(['sessions'])
  },

  scan: async (input) => {
    const { sessionId, ...body } = input
    const event = await api.scan(sessionId, body)
    if (input.confirm) await get().refreshSlices(['sessions', 'asns'])
    return event
  },

  finishReceiving: async (sessionId) => {
    const result = await api.finishReceiving(sessionId)
    if (result.ok) {
      await get().refreshSlices(['sessions', 'asns', 'discrepancies'])
    }
    return result
  },

  submitQc: async (input) => {
    const { sessionId, ...body } = input
    const result = await api.submitQc(sessionId, body)
    if (result.ok) await get().refreshSlices(['qcResults', 'sessions'])
    return result
  },

  resolveDiscrepancy: async (id, resolution, note) => {
    await api.resolveDiscrepancy(id, resolution, note)
    await get().refreshSlices(['discrepancies'])
  },

  generatePutawayTasks: async (sessionId) => {
    await api.generatePutawayTasks(sessionId)
    await get().refreshSlices(['putawayTasks', 'sessions', 'asns'])
  },

  confirmPutaway: async (taskId) => {
    const task = get().putawayTasks.find((t) => t.id === taskId)
    await api.confirmPutaway(taskId)
    await get().refreshSlices(['putawayTasks', 'inventory', 'sessions'])

    const sessionId = task?.sessionId
    if (sessionId === undefined) return

    const sessionComplete = get()
      .putawayTasks.filter((t) => t.sessionId === sessionId)
      .every((t) => t.status === 'CONFIRMED')

    if (sessionComplete) {
      await get().refreshSlices(['asns', 'docks'])
    }
  },
}))
