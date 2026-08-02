import {
  OVER_RECEIPT_TOLERANCE,
  willCauseSsccVariance,
  willCauseVariance,
  type ASN,
  type AsnPallet,
  type DiscrepancyType,
  type Product,
  type ReceivingSession,
  type ScanResult,
} from './receiving'

export interface ScanLineInput {
  sku: string
  qty: number
  lot?: string
  expiry?: string
}

export interface ScanValidationInput {
  code: string
  session: ReceivingSession
  asn: ASN
  products: Product[]
  lot?: string
  expiry?: string
  qty?: number
  lines?: ScanLineInput[]
  varianceReason?: string
  confirm?: boolean
  allowOverOverride?: boolean
}

export interface ScanValidationResult {
  result: ScanResult
  errorType?: string
  message: string
  actionHint?: string
  kind: 'SSCC' | 'SKU' | 'CONTAINER'
  apply?: {
    sscc?: string
    lines?: ScanLineInput[]
    containerCode?: string
    createDiscrepancy?: {
      type: DiscrepancyType
      sku?: string
      qty: number
      note?: string
    }
    createDiscrepancies?: Array<{
      type: DiscrepancyType
      sku?: string
      qty: number
      note?: string
    }>
  }
}

const SSCC_PATTERN = /^00\d{18}$/

function findPallet(asn: ASN, sscc: string): AsnPallet | undefined {
  return asn.pallets.find((p) => p.sscc === sscc)
}

function ssccLinesHaveVariance(
  asn: ASN,
  session: ReceivingSession,
  pallet: AsnPallet,
  lines: ScanLineInput[],
): boolean {
  return lines.some((l) => {
    const manifestQty = pallet.items.find((i) => i.sku === l.sku)?.qty
    return willCauseSsccVariance(asn, session, l.sku, l.qty, manifestQty)
      .hasVariance
  })
}

function validateSsccScan(input: ScanValidationInput): ScanValidationResult {
  const code = input.code.trim()

  if (!SSCC_PATTERN.test(code)) {
    return {
      result: 'BLOCK',
      errorType: 'INVALID_BARCODE',
      message: 'SSCC format invalid (expect 00 + 18 digits)',
      actionHint: 'Re-scan the pallet label',
      kind: 'SSCC',
    }
  }

  const pallet = findPallet(input.asn, code)
  if (!pallet) {
    const inOtherAsn = false
    return {
      result: 'BLOCK',
      errorType: inOtherAsn ? 'WRONG_ASN' : 'UNKNOWN_PALLET',
      message: 'SSCC not found on current ASN',
      actionHint: 'Verify pallet / escalate as exception',
      kind: 'SSCC',
      apply: {
        createDiscrepancy: { type: 'UNKNOWN', qty: 1, note: `Unknown SSCC ${code}` },
      },
    }
  }

  if (pallet.destinationWh !== 'WH-01') {
    return {
      result: 'BLOCK',
      errorType: 'WRONG_DESTINATION',
      message: `Pallet destined for ${pallet.destinationWh}, not WH-01`,
      actionHint: 'Do not receive — redirect / return',
      kind: 'SSCC',
    }
  }

  if (input.session.receivedSsccs.includes(code) || pallet.received) {
    return {
      result: 'WARN',
      errorType: 'DUPLICATE',
      message: 'SSCC already received',
      actionHint: 'Skip and scan next pallet',
      kind: 'SSCC',
    }
  }

  if (pallet.blocked || pallet.damaged) {
    return {
      result: 'BLOCK',
      errorType: 'DAMAGED_OR_BLOCKED',
      message: pallet.damaged ? 'Pallet flagged damaged' : 'Pallet is blocked',
      actionHint: 'Route to QC / Discrepancy',
      kind: 'SSCC',
      apply: {
        createDiscrepancy: {
          type: 'DAMAGED',
          qty: pallet.items.reduce((s, i) => s + i.qty, 0),
          note: `Blocked/damaged SSCC ${code}`,
        },
      },
    }
  }

  const defaultLines: ScanLineInput[] = pallet.items.map((i) => ({
    sku: i.sku,
    qty: i.qty,
    lot: i.lot,
    expiry: i.expiry,
  }))

  const lines =
    input.confirm && input.lines && input.lines.length > 0
      ? input.lines
      : defaultLines

  if (lines.some((l) => !l.sku || Number.isNaN(l.qty) || l.qty <= 0)) {
    return {
      result: 'BLOCK',
      errorType: 'INVALID',
      message: 'Invalid quantity on one or more pallet lines',
      actionHint: 'Adjust quantity then confirm',
      kind: 'SSCC',
    }
  }

  if (!input.confirm) {
    return {
      result: 'OK',
      message: `Pallet ${code} ready (${lines.length} SKUs) — adjust qty then confirm`,
      actionHint: 'Confirm receive after checking quantities',
      kind: 'SSCC',
      apply: {
        sscc: code,
        lines,
      },
    }
  }

  const hasVariance = ssccLinesHaveVariance(
    input.asn,
    input.session,
    pallet,
    lines,
  )
  if (hasVariance && !input.varianceReason?.trim()) {
    return {
      result: 'BLOCK',
      errorType: 'VARIANCE_REASON_REQUIRED',
      message: 'Quantity does not match expected — select a reason',
      actionHint: 'Pick a variance reason label',
      kind: 'SSCC',
      apply: {
        sscc: code,
        lines,
      },
    }
  }

  return {
    result: 'OK',
    message: `Pallet ${code} accepted (${lines.length} SKUs)`,
    actionHint: 'Continue scanning',
    kind: 'SSCC',
    apply: {
      sscc: code,
      lines,
    },
  }
}

function validateContainerScan(input: ScanValidationInput): ScanValidationResult {
  const code = input.code.trim()
  if (!code) {
    return {
      result: 'BLOCK',
      errorType: 'INVALID',
      message: 'Empty / unreadable barcode',
      actionHint: 'Re-scan',
      kind: 'CONTAINER',
    }
  }

  if (input.session.scannedContainers.includes(code)) {
    return {
      result: 'WARN',
      errorType: 'DUPLICATE',
      message: 'Container/serial already scanned',
      actionHint: 'Skip duplicate',
      kind: 'CONTAINER',
    }
  }

  const parts = code.split(':')
  const sku = parts[0]
  const parsedQty = parts.length > 1 ? Number(parts[1]) : undefined
  const qty =
    input.qty !== undefined
      ? input.qty
      : parsedQty !== undefined && !Number.isNaN(parsedQty)
        ? parsedQty
        : 1
  const lot = input.lot ?? parts[2]
  const expiry = input.expiry ?? parts[3]

  if (!sku || Number.isNaN(qty) || qty <= 0) {
    return {
      result: 'BLOCK',
      errorType: 'INVALID',
      message: 'Invalid container code. Use SKU barcode',
      actionHint: 'Re-scan or enter manually',
      kind: 'CONTAINER',
    }
  }

  const product = input.products.find((p) => p.sku === sku)
  const line = input.asn.lines.find((l) => l.sku === sku)

  if (!line) {
    return {
      result: 'BLOCK',
      errorType: 'UNEXPECTED_ITEM',
      message: `SKU ${sku} not on ASN`,
      actionHint: 'Block receipt — create WRONG_ITEM discrepancy',
      kind: 'SKU',
      apply: {
        createDiscrepancy: { type: 'WRONG_ITEM', sku, qty, note: 'Unexpected item' },
      },
    }
  }

  if (product?.requiresLotExpiry && (!lot || !expiry)) {
    return {
      result: 'BLOCK',
      errorType: 'MISSING_LOT_EXPIRY',
      message: `SKU ${sku} requires lot & expiry`,
      actionHint: 'Enter lot/expiry then confirm',
      kind: 'SKU',
      apply: {
        containerCode: code,
        lines: [{ sku, qty, lot, expiry }],
      },
    }
  }

  if (expiry) {
    const exp = new Date(expiry)
    if (!Number.isNaN(exp.getTime()) && exp.getTime() < Date.now()) {
      return {
        result: 'BLOCK',
        errorType: 'EXPIRED',
        message: `SKU ${sku} expired on ${expiry}`,
        actionHint: 'Hold as damaged / quarantine',
        kind: 'SKU',
        apply: {
          createDiscrepancy: { type: 'DAMAGED', sku, qty, note: 'Expired stock' },
        },
      }
    }
  }

  const variance = willCauseVariance(input.asn, input.session, sku, qty)
  const maxAllowed = line.expectedQty * (1 + OVER_RECEIPT_TOLERANCE)

  if (variance.next > maxAllowed && !input.allowOverOverride) {
    return {
      result: 'WARN',
      errorType: 'OVER_RECEIPT',
      message: `Over-receipt for ${sku}: ${variance.next} > ${line.expectedQty} (+${OVER_RECEIPT_TOLERANCE * 100}% tol)`,
      actionHint: 'Need supervisor override or create OVER discrepancy',
      kind: 'SKU',
      apply: {
        containerCode: code,
        lines: [{ sku, qty, lot, expiry }],
        createDiscrepancy: {
          type: 'OVER',
          sku,
          qty: variance.next - line.expectedQty,
          note: 'Over tolerance',
        },
      },
    }
  }

  if (!input.confirm) {
    return {
      result: 'OK',
      message: `${sku} ready — adjust qty then confirm`,
      actionHint: 'Confirm receive after checking quantity',
      kind: 'SKU',
      apply: {
        containerCode: code,
        lines: [{ sku, qty, lot, expiry }],
      },
    }
  }

  if (variance.hasVariance && !input.varianceReason?.trim()) {
    return {
      result: 'BLOCK',
      errorType: 'VARIANCE_REASON_REQUIRED',
      message: 'Quantity does not match expected — select a reason',
      actionHint: 'Pick a variance reason label',
      kind: 'SKU',
      apply: {
        containerCode: code,
        lines: [{ sku, qty, lot, expiry }],
      },
    }
  }

  return {
    result: 'OK',
    message: `Accepted ${qty} x ${sku}`,
    actionHint: 'Continue scanning',
    kind: 'SKU',
    apply: {
      containerCode: code,
      lines: [{ sku, qty, lot, expiry }],
    },
  }
}

export function validateScan(input: ScanValidationInput): ScanValidationResult {
  if (input.session.mode === 'SSCC') {
    return validateSsccScan(input)
  }
  return validateContainerScan(input)
}

export function findSsccOnOtherAsn(
  code: string,
  currentAsnId: string,
  allAsns: ASN[],
): ASN | undefined {
  return allAsns.find(
    (a) => a.id !== currentAsnId && a.pallets.some((p) => p.sscc === code),
  )
}
