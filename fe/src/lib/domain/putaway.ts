export type PutawayTaskStatus = 'PENDING' | 'CONFIRMED'
export type HandlingUnitType = 'SSCC' | 'CONTAINER'

export interface PutawayTaskLine {
  id: string
  sku: string
  qty: number
  confirmedQty?: number
}

export interface PutawayTask {
  id: string
  sessionId: string
  asnId: string
  handlingUnitType: HandlingUnitType
  handlingUnitCode: string
  assignedLocation?: string
  status: PutawayTaskStatus
  quarantine: boolean
  confirmedAt?: string
  lines: PutawayTaskLine[]
}

export interface ConfirmPutawayResult {
  ok: boolean
  assignedLocation?: string
  message?: string
}
