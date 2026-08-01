import type { ASN, PurchaseOrder } from '@/lib/domain/receiving'
import { delay } from './client'

export async function pushPo(po: PurchaseOrder): Promise<PurchaseOrder> {
  return delay(po)
}

export async function pushAsn(asn: ASN): Promise<ASN> {
  return delay(asn)
}
