import type {
  ASN,
  Appointment,
  Discrepancy,
  DiscrepancyResolution,
  Dock,
  DockAssignment,
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
import { apiClient } from './client'

export async function listSuppliers(): Promise<Supplier[]> {
  const { data } = await apiClient.get<Supplier[]>('/suppliers')
  return data
}

export async function listProducts(): Promise<Product[]> {
  const { data } = await apiClient.get<Product[]>('/products')
  return data
}

export async function listAsns(): Promise<ASN[]> {
  const { data } = await apiClient.get<ASN[]>('/asns')
  return data
}

export async function getAsn(id: string): Promise<ASN> {
  const { data } = await apiClient.get<ASN>(`/asns/${id}`)
  return data
}

export async function listDocks(): Promise<Dock[]> {
  const { data } = await apiClient.get<Dock[]>('/docks')
  return data
}

export async function getMyDockAssignment(): Promise<DockAssignment | null> {
  const { data } = await apiClient.get<DockAssignment | null>(
    '/docks/assignments/me',
  )
  return data
}

export async function checkInDock(dockId: string): Promise<DockAssignment> {
  const { data } = await apiClient.post<DockAssignment>(
    `/docks/${dockId}/check-in`,
  )
  return data
}

export async function checkOutDock(): Promise<DockAssignment> {
  const { data } = await apiClient.post<DockAssignment>('/docks/check-out')
  return data
}

export async function listAppointments(): Promise<Appointment[]> {
  const { data } = await apiClient.get<Appointment[]>('/appointments')
  return data
}

export async function scheduleAppointment(input: {
  asnId: string
  dockId: string
  windowStart: string
  windowEnd: string
}) {
  const { data } = await apiClient.post<{
    ok: boolean
    message: string
    appointmentId?: string
  }>('/appointments', input)
  return data
}

export async function listSessions(): Promise<ReceivingSession[]> {
  const { data } = await apiClient.get<ReceivingSession[]>('/sessions')
  return data
}

export async function getSession(id: string): Promise<ReceivingSession> {
  const { data } = await apiClient.get<ReceivingSession>(`/sessions/${id}`)
  return data
}

export async function gateIn(input: {
  appointmentId?: string
  asnId?: string
  dockId: string
}) {
  const { data } = await apiClient.post<{
    ok: boolean
    message: string
    sessionId?: string
    unknownArrival?: boolean
  }>('/sessions/gate-in', input)
  return data
}

export async function rejectArrival(sessionId: string, reason: string) {
  const { data } = await apiClient.patch(`/sessions/${sessionId}/reject-arrival`, {
    reason,
  })
  return data
}

export async function approveUnknownArrival(sessionId: string) {
  const { data } = await apiClient.patch(
    `/sessions/${sessionId}/approve-unknown`,
  )
  return data
}

export async function startUnload(sessionId: string) {
  const { data } = await apiClient.patch(`/sessions/${sessionId}/start-unload`)
  return data
}

export async function startReceiving(sessionId: string) {
  const { data } = await apiClient.patch(
    `/sessions/${sessionId}/start-receiving`,
  )
  return data
}

export async function scan(
  sessionId: string,
  input: {
    code: string
    lot?: string
    expiry?: string
    qty?: number
    lines?: ScanLineInput[]
    varianceReason?: string
    varianceReasonId?: ReceiptVarianceReasonId
    confirm?: boolean
    allowOverOverride?: boolean
  },
): Promise<ScanEvent> {
  const { data } = await apiClient.post<ScanEvent>(
    `/sessions/${sessionId}/scan`,
    input,
  )
  return data
}

export async function finishReceiving(sessionId: string) {
  const { data } = await apiClient.post<{ ok: boolean; message: string }>(
    `/sessions/${sessionId}/finish-receiving`,
  )
  return data
}

export async function submitQc(
  sessionId: string,
  input: {
    sku: string
    sampleQty: number
    pass: boolean
    reason?: string
  },
) {
  const { data } = await apiClient.post<{ ok: boolean; message: string }>(
    `/sessions/${sessionId}/qc`,
    input,
  )
  return data
}

export async function listQcResults(): Promise<QCResult[]> {
  const { data } = await apiClient.get<QCResult[]>('/qc-results')
  return data
}

export async function listDiscrepancies(): Promise<Discrepancy[]> {
  const { data } = await apiClient.get<Discrepancy[]>('/discrepancies')
  return data
}

export async function resolveDiscrepancy(
  id: string,
  resolution: DiscrepancyResolution,
  note?: string,
) {
  const { data } = await apiClient.patch(`/discrepancies/${id}`, {
    resolution,
    note,
  })
  return data
}

export async function generatePutawayTasks(sessionId: string) {
  const { data } = await apiClient.post(`/sessions/${sessionId}/putaway-tasks`)
  return data
}

export async function confirmPutaway(taskId: string) {
  const { data } = await apiClient.patch(`/putaway-tasks/${taskId}/confirm`)
  return data
}

export async function listPutawayTasks(): Promise<PutawayTask[]> {
  const { data } = await apiClient.get<PutawayTask[]>('/putaway-tasks')
  return data
}

export async function listInventory(): Promise<InventoryRecord[]> {
  const { data } = await apiClient.get<InventoryRecord[]>('/inventory')
  return data
}
