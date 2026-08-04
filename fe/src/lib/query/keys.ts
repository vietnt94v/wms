export const receivingKeys = {
  all: ['receiving'] as const,
  suppliers: () => [...receivingKeys.all, 'suppliers'] as const,
  products: () => [...receivingKeys.all, 'products'] as const,
  asns: () => [...receivingKeys.all, 'asns'] as const,
  asn: (id: string) => [...receivingKeys.asns(), id] as const,
  docks: () => [...receivingKeys.all, 'docks'] as const,
  appointments: () => [...receivingKeys.all, 'appointments'] as const,
  sessions: () => [...receivingKeys.all, 'sessions'] as const,
  session: (id: string) => [...receivingKeys.sessions(), id] as const,
  discrepancies: () => [...receivingKeys.all, 'discrepancies'] as const,
  qcResults: () => [...receivingKeys.all, 'qc-results'] as const,
  putawayTasks: () => [...receivingKeys.all, 'putaway-tasks'] as const,
  inventory: () => [...receivingKeys.all, 'inventory'] as const,
}

export type ReceivingSlice =
  | 'asns'
  | 'docks'
  | 'appointments'
  | 'sessions'
  | 'discrepancies'
  | 'qcResults'
  | 'putawayTasks'
  | 'inventory'

const sliceKeyMap: Record<ReceivingSlice, readonly string[]> = {
  asns: receivingKeys.asns(),
  docks: receivingKeys.docks(),
  appointments: receivingKeys.appointments(),
  sessions: receivingKeys.sessions(),
  discrepancies: receivingKeys.discrepancies(),
  qcResults: receivingKeys.qcResults(),
  putawayTasks: receivingKeys.putawayTasks(),
  inventory: receivingKeys.inventory(),
}

export function receivingSliceKeys(slices: ReceivingSlice[]) {
  return [...new Set(slices)].map((slice) => sliceKeyMap[slice])
}
