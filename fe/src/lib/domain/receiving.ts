export const OVER_RECEIPT_TOLERANCE = 0.05
export const DEFAULT_WAREHOUSE = 'WH-01'

export type AsnType = 'SSCC' | 'CONTAINER'
export type DockStatus = 'AVAILABLE' | 'OCCUPIED' | 'BLOCKED'
export type AsnStatus =
  | 'EXPECTED'
  | 'SCHEDULED'
  | 'GATE_IN'
  | 'UNLOADING'
  | 'RECEIVING'
  | 'QC'
  | 'DISCREPANCY'
  | 'PUTAWAY'
  | 'COMPLETED'
  | 'REJECTED'

export type AppointmentStatus = 'BOOKED' | 'ARRIVED' | 'CANCELLED' | 'COMPLETED'
export type SessionStatus =
  | 'GATE_IN'
  | 'UNLOADING'
  | 'RECEIVING'
  | 'QC'
  | 'DISCREPANCY'
  | 'PUTAWAY'
  | 'COMPLETED'
  | 'REJECTED'

export type DiscrepancyType =
  | 'OVER'
  | 'SHORT'
  | 'DAMAGED'
  | 'WRONG_ITEM'
  | 'QC_FAIL'
  | 'UNKNOWN'

export type DiscrepancyResolution =
  | 'PENDING'
  | 'ACCEPT_VARIANCE'
  | 'REJECT'
  | 'PARTIAL_ACCEPT'
  | 'QUARANTINE'
  | 'CLAIM_SUPPLIER'

export type PutawayTaskStatus = 'PENDING' | 'CONFIRMED'
export type ScanResult = 'OK' | 'WARN' | 'BLOCK'

export interface Supplier {
  id: string
  name: string
}

export interface Product {
  sku: string
  name: string
  uom: string
  requiresLotExpiry: boolean
  shelfLifeDays?: number
}

export interface PoLine {
  sku: string
  qty: number
}

export interface PurchaseOrder {
  id: string
  supplierId: string
  lines: PoLine[]
  status: 'OPEN' | 'CLOSED'
}

export interface AsnLine {
  sku: string
  expectedQty: number
  receivedQty: number
}

export interface PalletItem {
  sku: string
  qty: number
  lot?: string
  expiry?: string
}

export interface AsnPallet {
  sscc: string
  items: PalletItem[]
  destinationWh: string
  blocked?: boolean
  damaged?: boolean
  received?: boolean
}

export interface ASN {
  id: string
  poId: string
  type: AsnType
  carrier: string
  plateNo: string
  status: AsnStatus
  pallets: AsnPallet[]
  lines: AsnLine[]
  eta?: string
}

export interface Dock {
  id: string
  name: string
  status: DockStatus
}

export interface Appointment {
  id: string
  asnId: string
  dockId: string
  windowStart: string
  windowEnd: string
  status: AppointmentStatus
}

export interface ReceivedLine {
  sku: string
  qty: number
  lot?: string
  expiry?: string
  quarantine?: boolean
}

export interface ScanEvent {
  id: string
  code: string
  kind: 'SSCC' | 'SKU' | 'CONTAINER'
  result: ScanResult
  errorType?: string
  message: string
  actionHint?: string
  ts: string
}

export interface Discrepancy {
  id: string
  sessionId: string
  asnId: string
  type: DiscrepancyType
  sku?: string
  qty: number
  note?: string
  resolution: DiscrepancyResolution
}

export interface ReceivingSession {
  id: string
  asnId: string
  dockId: string
  mode: AsnType
  status: SessionStatus
  plateNoEntered?: string
  receivedLines: ReceivedLine[]
  scanEvents: ScanEvent[]
  receivedSsccs: string[]
  scannedContainers: string[]
  unknownArrival?: boolean
  supervisorApproved?: boolean
}

export interface QCResult {
  id: string
  sessionId: string
  sku: string
  sampleQty: number
  pass: boolean
  reason?: string
}

export interface PutawayTask {
  id: string
  sessionId: string
  asnId: string
  sscc?: string
  sku: string
  qty: number
  suggestedLocation: string
  status: PutawayTaskStatus
  quarantine: boolean
}

export interface InventoryRecord {
  sku: string
  available: number
  quarantine: number
}

export function uid(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 8)}-${Date.now().toString(36)}`
}
