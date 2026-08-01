import {
  OVER_RECEIPT_TOLERANCE,
  type ASN,
  type AsnPallet,
  type Product,
  type ReceivingSession,
  type ScanResult,
} from './receiving'

export interface ScanValidationInput {
  code: string
  session: ReceivingSession
  asn: ASN
  products: Product[]
  lot?: string
  expiry?: string
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
    lines?: Array<{ sku: string; qty: number; lot?: string; expiry?: string }>
    containerCode?: string
    createDiscrepancy?: {
      type: 'OVER' | 'WRONG_ITEM' | 'DAMAGED' | 'UNKNOWN'
      sku?: string
      qty: number
      note?: string
    }
  }
}

const SSCC_PATTERN = /^00\d{18}$/

function findPallet(asn: ASN, sscc: string): AsnPallet | undefined {
  return asn.pallets.find((p) => p.sscc === sscc)
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

  return {
    result: 'OK',
    message: `Pallet ${code} accepted (${pallet.items.length} SKUs)`,
    actionHint: 'Continue scanning',
    kind: 'SSCC',
    apply: {
      sscc: code,
      lines: pallet.items.map((i) => ({
        sku: i.sku,
        qty: i.qty,
        lot: i.lot,
        expiry: i.expiry,
      })),
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
  const qty = parts.length > 1 ? Number(parts[1]) : 1
  const lot = input.lot ?? parts[2]
  const expiry = input.expiry ?? parts[3]

  if (!sku || Number.isNaN(qty) || qty <= 0) {
    return {
      result: 'BLOCK',
      errorType: 'INVALID',
      message: 'Invalid container code. Use SKU or SKU:QTY[:LOT:EXPIRY]',
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
      message: `SKU ${sku} not on ASN/PO`,
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
      actionHint: 'Enter lot/expiry then re-scan',
      kind: 'SKU',
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

  const already = input.session.receivedLines
    .filter((l) => l.sku === sku && !l.quarantine)
    .reduce((s, l) => s + l.qty, 0)
  const nextQty = already + qty
  const maxAllowed = line.expectedQty * (1 + OVER_RECEIPT_TOLERANCE)

  if (nextQty > maxAllowed && !input.allowOverOverride) {
    return {
      result: 'WARN',
      errorType: 'OVER_RECEIPT',
      message: `Over-receipt for ${sku}: ${nextQty} > ${line.expectedQty} (+${OVER_RECEIPT_TOLERANCE * 100}% tol)`,
      actionHint: 'Need supervisor override or create OVER discrepancy',
      kind: 'SKU',
      apply: {
        createDiscrepancy: {
          type: 'OVER',
          sku,
          qty: nextQty - line.expectedQty,
          note: 'Over tolerance',
        },
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
