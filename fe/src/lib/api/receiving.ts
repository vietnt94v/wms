import type {
  ASN,
  Appointment,
  Discrepancy,
  Dock,
  InventoryRecord,
  PutawayTask,
  QCResult,
  ReceivingSession,
} from '@/lib/domain/receiving'
import { delay } from './client'

export async function listAsns(asns: ASN[]) {
  return delay(asns)
}

export async function getAsn(asns: ASN[], id: string) {
  return delay(asns.find((a) => a.id === id) ?? null)
}

export async function listDocks(docks: Dock[]) {
  return delay(docks)
}

export async function listAppointments(appointments: Appointment[]) {
  return delay(appointments)
}

export async function getSession(sessions: ReceivingSession[], id: string) {
  return delay(sessions.find((s) => s.id === id) ?? null)
}

export async function listDiscrepancies(items: Discrepancy[]) {
  return delay(items)
}

export async function listQc(items: QCResult[]) {
  return delay(items)
}

export async function listPutawayTasks(items: PutawayTask[]) {
  return delay(items)
}

export async function listInventory(items: InventoryRecord[]) {
  return delay(items)
}
