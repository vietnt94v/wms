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

export type ReceiptVarianceReasonId =
  | 'SHORT_SHIPMENT'
  | 'DAMAGED'
  | 'LABEL_COUNT_ERROR'
  | 'EXTRA_UNITS'
  | 'WRONG_ITEM'
  | 'OTHER'

export interface ReceiptVarianceReason {
  id: ReceiptVarianceReasonId
  label: string
  discrepancyType: DiscrepancyType | null
}

export const RECEIPT_VARIANCE_REASONS: ReceiptVarianceReason[] = [
  {
    id: 'SHORT_SHIPMENT',
    label: 'Short shipment',
    discrepancyType: 'SHORT',
  },
  {
    id: 'DAMAGED',
    label: 'Damaged / missing units',
    discrepancyType: 'DAMAGED',
  },
  {
    id: 'LABEL_COUNT_ERROR',
    label: 'Label count error',
    discrepancyType: 'SHORT',
  },
  {
    id: 'EXTRA_UNITS',
    label: 'Extra units shipped',
    discrepancyType: 'OVER',
  },
  {
    id: 'WRONG_ITEM',
    label: 'Wrong item',
    discrepancyType: 'WRONG_ITEM',
  },
  {
    id: 'OTHER',
    label: 'Other',
    discrepancyType: null,
  },
]

export interface VarianceCheck {
  hasVariance: boolean
  expected: number
  current: number
  next: number
  gap: number
}

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

export function totalReceivedQty(session: ReceivingSession): number {
  return session.receivedLines.reduce((sum, line) => sum + line.qty, 0)
}

export function canFinishReceiving(session: ReceivingSession): {
  ok: boolean
  message: string
} {
  if (totalReceivedQty(session) === 0) {
    const scanHint =
      session.mode === 'SSCC'
        ? 'Scan at least one SSCC before closing receiving.'
        : 'Scan at least one container or SKU before closing receiving.'
    return { ok: false, message: scanHint }
  }

  return { ok: true, message: 'Ready to close receiving' }
}

export function getQcResultForSku(
  qcResults: QCResult[],
  sessionId: string,
  sku: string,
): QCResult | undefined {
  return qcResults.find((q) => q.sessionId === sessionId && q.sku === sku)
}

export function receivedSkus(session: ReceivingSession): string[] {
  return [...new Set(session.receivedLines.map((l) => l.sku))]
}

export function pendingQcSkus(
  session: ReceivingSession,
  qcResults: QCResult[],
): string[] {
  return receivedSkus(session).filter(
    (sku) => !getQcResultForSku(qcResults, session.id, sku),
  )
}

export function receivedQtyForSku(
  session: ReceivingSession,
  sku: string,
): number {
  return session.receivedLines
    .filter((l) => l.sku === sku && !l.quarantine)
    .reduce((sum, l) => sum + l.qty, 0)
}

export function willCauseVariance(
  asn: ASN,
  session: ReceivingSession,
  sku: string,
  qtyToAdd: number,
): VarianceCheck {
  const line = asn.lines.find((l) => l.sku === sku)
  const expected = line?.expectedQty ?? 0
  const current = receivedQtyForSku(session, sku)
  const next = current + qtyToAdd
  const gap = next - expected
  return {
    hasVariance: next !== expected,
    expected,
    current,
    next,
    gap,
  }
}

export function resolveVarianceDiscrepancyType(
  reasonId: ReceiptVarianceReasonId | undefined,
  gap: number,
): DiscrepancyType {
  const reason = RECEIPT_VARIANCE_REASONS.find((r) => r.id === reasonId)
  if (reason?.discrepancyType) return reason.discrepancyType
  return gap > 0 ? 'OVER' : 'SHORT'
}
