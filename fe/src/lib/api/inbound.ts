import type { ASN, AsnType } from '@/lib/domain/receiving'
import { apiClient } from './client'

export interface CreateAsnPayload {
  id?: string
  supplierId: string
  type: AsnType
  carrier: string
  plateNo: string
  lines: Array<{ sku: string; expectedQty: number }>
  pallets?: Array<{
    sscc: string
    destinationWh: string
    items: Array<{ sku: string; qty: number; lot?: string; expiry?: string }>
  }>
}

export async function createAsn(payload: CreateAsnPayload): Promise<ASN> {
  const { data } = await apiClient.post<ASN>('/inbound/asns', payload)
  return data
}
