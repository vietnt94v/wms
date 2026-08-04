export const OVER_RECEIPT_TOLERANCE = 0.05;
export const DEFAULT_WAREHOUSE = 'WH-01';

export type AsnType = 'SSCC' | 'CONTAINER';
export type DockStatus = 'AVAILABLE' | 'OCCUPIED' | 'BLOCKED';
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
  | 'REJECTED';

export type AppointmentStatus =
  'BOOKED' | 'ARRIVED' | 'CANCELLED' | 'COMPLETED';
export type SessionStatus =
  | 'GATE_IN'
  | 'UNLOADING'
  | 'RECEIVING'
  | 'QC'
  | 'DISCREPANCY'
  | 'PUTAWAY'
  | 'COMPLETED'
  | 'REJECTED';

export type DiscrepancyType =
  'OVER' | 'SHORT' | 'DAMAGED' | 'WRONG_ITEM' | 'QC_FAIL' | 'UNKNOWN';

export type ReceiptVarianceReasonId =
  | 'SHORT_SHIPMENT'
  | 'DAMAGED'
  | 'LABEL_COUNT_ERROR'
  | 'EXTRA_UNITS'
  | 'WRONG_ITEM'
  | 'OTHER';

export type DiscrepancyResolution =
  | 'PENDING'
  | 'ACCEPT_VARIANCE'
  | 'REJECT'
  | 'PARTIAL_ACCEPT'
  | 'QUARANTINE'
  | 'CLAIM_SUPPLIER';

export type PutawayTaskStatus = 'PENDING' | 'CONFIRMED';
export type ScanResult = 'OK' | 'WARN' | 'BLOCK';

export interface AsnLineDto {
  sku: string;
  expectedQty: number;
  receivedQty: number;
}

export interface PalletItemDto {
  sku: string;
  qty: number;
  lot?: string;
  expiry?: string;
}

export interface AsnPalletDto {
  sscc: string;
  items: PalletItemDto[];
  destinationWh: string;
  blocked?: boolean;
  damaged?: boolean;
  received?: boolean;
}

export interface AsnDto {
  id: string;
  supplierId: string;
  type: AsnType;
  carrier: string;
  plateNo: string;
  status: AsnStatus;
  pallets: AsnPalletDto[];
  lines: AsnLineDto[];
  eta?: string;
}

export interface ProductDto {
  sku: string;
  name: string;
  uom: string;
  requiresLotExpiry: boolean;
  shelfLifeDays?: number;
}

export interface ReceivedLineDto {
  sku: string;
  qty: number;
  lot?: string;
  expiry?: string;
  quarantine?: boolean;
}

export interface ScanEventDto {
  id: string;
  code: string;
  kind: 'SSCC' | 'SKU' | 'CONTAINER';
  result: ScanResult;
  errorType?: string;
  message: string;
  actionHint?: string;
  ts: string;
}

export interface ReceivingSessionDto {
  id: string;
  asnId: string;
  dockId: string;
  mode: AsnType;
  status: SessionStatus;
  plateNoEntered?: string;
  receivedLines: ReceivedLineDto[];
  scanEvents: ScanEventDto[];
  receivedSsccs: string[];
  scannedContainers: string[];
  unknownArrival?: boolean;
  supervisorApproved?: boolean;
}

export interface VarianceCheck {
  hasVariance: boolean;
  expected: number;
  current: number;
  next: number;
  gap: number;
}

export const RECEIPT_VARIANCE_REASONS: Array<{
  id: ReceiptVarianceReasonId;
  label: string;
  discrepancyType: DiscrepancyType | null;
}> = [
  { id: 'SHORT_SHIPMENT', label: 'Short shipment', discrepancyType: 'SHORT' },
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
  { id: 'EXTRA_UNITS', label: 'Extra units shipped', discrepancyType: 'OVER' },
  { id: 'WRONG_ITEM', label: 'Wrong item', discrepancyType: 'WRONG_ITEM' },
  { id: 'OTHER', label: 'Other', discrepancyType: null },
];

export function uid(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 8)}-${Date.now().toString(36)}`;
}

export function receivedQtyForSku(
  session: ReceivingSessionDto,
  sku: string,
): number {
  return session.receivedLines
    .filter((l) => l.sku === sku && !l.quarantine)
    .reduce((sum, l) => sum + l.qty, 0);
}

export function willCauseVariance(
  asn: AsnDto,
  session: ReceivingSessionDto,
  sku: string,
  qtyToAdd: number,
): VarianceCheck {
  const line = asn.lines.find((l) => l.sku === sku);
  const expected = line?.expectedQty ?? 0;
  const current = receivedQtyForSku(session, sku);
  const next = current + qtyToAdd;
  const gap = next - expected;
  return {
    hasVariance: next !== expected,
    expected,
    current,
    next,
    gap,
  };
}

export function willCauseSsccVariance(
  asn: AsnDto,
  session: ReceivingSessionDto,
  sku: string,
  qtyToAdd: number,
  manifestQty?: number,
): VarianceCheck {
  const line = asn.lines.find((l) => l.sku === sku);
  const expected = line?.expectedQty ?? 0;
  const current = receivedQtyForSku(session, sku);
  const next = current + qtyToAdd;
  const gap = next - expected;
  const maxAllowed = expected * (1 + OVER_RECEIPT_TOLERANCE);
  const overReceipt = next > maxAllowed;
  const manifestMismatch =
    manifestQty !== undefined && qtyToAdd !== manifestQty;
  return {
    hasVariance: overReceipt || manifestMismatch,
    expected,
    current,
    next,
    gap,
  };
}

export function resolveVarianceDiscrepancyType(
  reasonId: ReceiptVarianceReasonId | undefined,
  gap: number,
): DiscrepancyType {
  const reason = RECEIPT_VARIANCE_REASONS.find((r) => r.id === reasonId);
  if (reason?.discrepancyType) return reason.discrepancyType;
  return gap > 0 ? 'OVER' : 'SHORT';
}

const GATE_IN_ASN_STATUSES: AsnStatus[] = ['EXPECTED', 'SCHEDULED'];

export function canGateInAsn(asn: { status: AsnStatus }): {
  ok: boolean;
  message: string;
} {
  if (asn.status === 'COMPLETED') {
    return {
      ok: false,
      message: 'ASN already completed — create a new ASN for another delivery',
    };
  }
  if (asn.status === 'REJECTED') {
    return {
      ok: false,
      message: 'ASN was rejected — create a new ASN to receive again',
    };
  }
  if (!GATE_IN_ASN_STATUSES.includes(asn.status)) {
    return {
      ok: false,
      message: `ASN is in ${asn.status} — finish or reject the current receiving session first`,
    };
  }
  return { ok: true, message: 'ASN eligible for gate-in' };
}

export function canFinishReceiving(session: ReceivingSessionDto): {
  ok: boolean;
  message: string;
} {
  const total = session.receivedLines.reduce((sum, line) => sum + line.qty, 0);
  if (total === 0) {
    const scanHint =
      session.mode === 'SSCC'
        ? 'Scan at least one SSCC before closing receiving.'
        : 'Scan at least one container or SKU before closing receiving.';
    return { ok: false, message: scanHint };
  }
  return { ok: true, message: 'Ready to close receiving' };
}
