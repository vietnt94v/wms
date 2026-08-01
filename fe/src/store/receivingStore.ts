import { create } from 'zustand'
import {
  uid,
  type ASN,
  type Appointment,
  type Discrepancy,
  type DiscrepancyResolution,
  type Dock,
  type InventoryRecord,
  type Product,
  type PurchaseOrder,
  type PutawayTask,
  type QCResult,
  type ReceivingSession,
  type ScanEvent,
  type Supplier,
} from '@/lib/domain/receiving'
import { findSsccOnOtherAsn, validateScan } from '@/lib/domain/scan'
import {
  asns as seedAsns,
  docks as seedDocks,
  inventory as seedInventory,
  products as seedProducts,
  purchaseOrders as seedPos,
  suppliers as seedSuppliers,
} from '@/lib/mock/seed'

interface ReceivingState {
  suppliers: Supplier[]
  products: Product[]
  purchaseOrders: PurchaseOrder[]
  asns: ASN[]
  docks: Dock[]
  appointments: Appointment[]
  sessions: ReceivingSession[]
  discrepancies: Discrepancy[]
  qcResults: QCResult[]
  putawayTasks: PutawayTask[]
  inventory: InventoryRecord[]

  pushPo: (po: PurchaseOrder) => void
  pushAsn: (asn: ASN) => void

  scheduleAppointment: (input: {
    asnId: string
    dockId: string
    windowStart: string
    windowEnd: string
  }) => { ok: boolean; message: string; appointmentId?: string }

  gateIn: (input: {
    appointmentId?: string
    asnId?: string
    dockId: string
    plateNo: string
  }) => { ok: boolean; message: string; sessionId?: string; unknownArrival?: boolean }

  rejectArrival: (sessionId: string, reason: string) => void
  approveUnknownArrival: (sessionId: string) => void
  startUnload: (sessionId: string) => void
  startReceiving: (sessionId: string) => void

  scan: (input: {
    sessionId: string
    code: string
    lot?: string
    expiry?: string
    allowOverOverride?: boolean
  }) => ScanEvent

  finishReceiving: (sessionId: string) => void
  submitQc: (input: {
    sessionId: string
    sku: string
    sampleQty: number
    pass: boolean
    reason?: string
  }) => void
  resolveDiscrepancy: (
    id: string,
    resolution: DiscrepancyResolution,
    note?: string,
  ) => void
  generatePutawayTasks: (sessionId: string) => void
  confirmPutaway: (taskId: string) => void
}

function bumpAsnLines(asn: ASN, lines: Array<{ sku: string; qty: number }>): ASN {
  return {
    ...asn,
    lines: asn.lines.map((line) => {
      const add = lines
        .filter((l) => l.sku === line.sku)
        .reduce((s, l) => s + l.qty, 0)
      return { ...line, receivedQty: line.receivedQty + add }
    }),
  }
}

function suggestLocation(sku: string, quarantine: boolean): string {
  if (quarantine) return `QUA-${sku.slice(-3)}-01`
  return `A-${sku.slice(-3)}-01`
}

export const useReceivingStore = create<ReceivingState>((set, get) => ({
  suppliers: seedSuppliers,
  products: seedProducts,
  purchaseOrders: seedPos,
  asns: seedAsns,
  docks: seedDocks,
  appointments: [],
  sessions: [],
  discrepancies: [],
  qcResults: [],
  putawayTasks: [],
  inventory: seedInventory,

  pushPo: (po) =>
    set((s) => ({
      purchaseOrders: s.purchaseOrders.some((p) => p.id === po.id)
        ? s.purchaseOrders.map((p) => (p.id === po.id ? po : p))
        : [...s.purchaseOrders, po],
    })),

  pushAsn: (asn) =>
    set((s) => ({
      asns: s.asns.some((a) => a.id === asn.id)
        ? s.asns.map((a) => (a.id === asn.id ? asn : a))
        : [...s.asns, { ...asn, status: asn.status || 'EXPECTED' }],
    })),

  scheduleAppointment: ({ asnId, dockId, windowStart, windowEnd }) => {
    const state = get()
    const dock = state.docks.find((d) => d.id === dockId)
    const asn = state.asns.find((a) => a.id === asnId)
    if (!dock || !asn) return { ok: false, message: 'Dock or ASN not found' }
    if (dock.status === 'BLOCKED') return { ok: false, message: 'Dock is blocked' }
    if (!['EXPECTED', 'SCHEDULED'].includes(asn.status)) {
      return { ok: false, message: `ASN status ${asn.status} cannot be scheduled` }
    }

    const appointment: Appointment = {
      id: uid('APT'),
      asnId,
      dockId,
      windowStart,
      windowEnd,
      status: 'BOOKED',
    }

    set((s) => ({
      appointments: [...s.appointments, appointment],
      asns: s.asns.map((a) =>
        a.id === asnId ? { ...a, status: 'SCHEDULED' } : a,
      ),
    }))

    return { ok: true, message: 'Appointment booked', appointmentId: appointment.id }
  },

  gateIn: ({ appointmentId, asnId, dockId, plateNo }) => {
    const state = get()
    const dock = state.docks.find((d) => d.id === dockId)
    if (!dock) return { ok: false, message: 'Dock not found' }
    if (dock.status === 'OCCUPIED') return { ok: false, message: 'Dock already occupied' }
    if (dock.status === 'BLOCKED') return { ok: false, message: 'Dock is blocked' }

    const appointment = appointmentId
      ? state.appointments.find((a) => a.id === appointmentId)
      : undefined
    let asn = asnId
      ? state.asns.find((a) => a.id === asnId)
      : appointment
        ? state.asns.find((a) => a.id === appointment.asnId)
        : undefined

    let unknownArrival = false
    if (appointment && asn) {
      if (asn.plateNo.toUpperCase() !== plateNo.trim().toUpperCase()) {
        unknownArrival = true
      }
    } else if (asn) {
      if (asn.plateNo.toUpperCase() !== plateNo.trim().toUpperCase()) {
        unknownArrival = true
      }
    } else {
      asn = state.asns.find(
        (a) => a.plateNo.toUpperCase() === plateNo.trim().toUpperCase(),
      )
      if (!asn) {
        unknownArrival = true
      }
    }

    if (!asn) {
      const session: ReceivingSession = {
        id: uid('SES'),
        asnId: 'UNKNOWN',
        dockId,
        mode: 'CONTAINER',
        status: 'GATE_IN',
        plateNoEntered: plateNo,
        receivedLines: [],
        scanEvents: [],
        receivedSsccs: [],
        scannedContainers: [],
        unknownArrival: true,
      }
      set((s) => ({
        sessions: [...s.sessions, session],
        docks: s.docks.map((d) =>
          d.id === dockId ? { ...d, status: 'OCCUPIED' } : d,
        ),
      }))
      return {
        ok: true,
        message: 'Unscheduled / unknown arrival — supervisor action required',
        sessionId: session.id,
        unknownArrival: true,
      }
    }

    const session: ReceivingSession = {
      id: uid('SES'),
      asnId: asn.id,
      dockId,
      mode: asn.type,
      status: 'GATE_IN',
      plateNoEntered: plateNo,
      receivedLines: [],
      scanEvents: [],
      receivedSsccs: [],
      scannedContainers: [],
      unknownArrival,
    }

    set((s) => ({
      sessions: [...s.sessions, session],
      docks: s.docks.map((d) =>
        d.id === dockId ? { ...d, status: 'OCCUPIED' } : d,
      ),
      asns: s.asns.map((a) =>
        a.id === asn!.id ? { ...a, status: 'GATE_IN' } : a,
      ),
      appointments: appointment
        ? s.appointments.map((a) =>
            a.id === appointment!.id ? { ...a, status: 'ARRIVED' } : a,
          )
        : s.appointments,
    }))

    return {
      ok: true,
      message: unknownArrival
        ? 'Plate mismatch — treat as unknown arrival'
        : 'Gate-in successful',
      sessionId: session.id,
      unknownArrival,
    }
  },

  rejectArrival: (sessionId, reason) => {
    set((s) => {
      const session = s.sessions.find((x) => x.id === sessionId)
      if (!session) return s
      return {
        sessions: s.sessions.map((x) =>
          x.id === sessionId ? { ...x, status: 'REJECTED' } : x,
        ),
        docks: s.docks.map((d) =>
          d.id === session.dockId ? { ...d, status: 'AVAILABLE' } : d,
        ),
        asns:
          session.asnId === 'UNKNOWN'
            ? s.asns
            : s.asns.map((a) =>
                a.id === session.asnId ? { ...a, status: 'REJECTED' } : a,
              ),
        discrepancies: [
          ...s.discrepancies,
          {
            id: uid('DSC'),
            sessionId,
            asnId: session.asnId,
            type: 'UNKNOWN',
            qty: 0,
            note: reason,
            resolution: 'REJECT',
          },
        ],
      }
    })
  },

  approveUnknownArrival: (sessionId) => {
    set((s) => ({
      sessions: s.sessions.map((x) =>
        x.id === sessionId
          ? { ...x, supervisorApproved: true, unknownArrival: false }
          : x,
      ),
    }))
  },

  startUnload: (sessionId) => {
    set((s) => {
      const session = s.sessions.find((x) => x.id === sessionId)
      if (!session || session.asnId === 'UNKNOWN') return s
      if (session.unknownArrival && !session.supervisorApproved) return s
      return {
        sessions: s.sessions.map((x) =>
          x.id === sessionId ? { ...x, status: 'UNLOADING' } : x,
        ),
        asns: s.asns.map((a) =>
          a.id === session.asnId ? { ...a, status: 'UNLOADING' } : a,
        ),
      }
    })
  },

  startReceiving: (sessionId) => {
    set((s) => {
      const session = s.sessions.find((x) => x.id === sessionId)
      if (!session) return s
      return {
        sessions: s.sessions.map((x) =>
          x.id === sessionId ? { ...x, status: 'RECEIVING' } : x,
        ),
        asns: s.asns.map((a) =>
          a.id === session.asnId ? { ...a, status: 'RECEIVING' } : a,
        ),
      }
    })
  },

  scan: ({ sessionId, code, lot, expiry, allowOverOverride }) => {
    const state = get()
    const session = state.sessions.find((s) => s.id === sessionId)
    if (!session) {
      return {
        id: uid('SCN'),
        code,
        kind: 'SKU',
        result: 'BLOCK',
        errorType: 'NO_SESSION',
        message: 'Session not found',
        ts: new Date().toISOString(),
      }
    }

    const asn = state.asns.find((a) => a.id === session.asnId)
    if (!asn) {
      const event: ScanEvent = {
        id: uid('SCN'),
        code,
        kind: 'SKU',
        result: 'BLOCK',
        errorType: 'NO_ASN',
        message: 'No ASN linked — cannot receive',
        actionHint: 'Reject arrival or link ASN via supervisor',
        ts: new Date().toISOString(),
      }
      set((s) => ({
        sessions: s.sessions.map((x) =>
          x.id === sessionId
            ? { ...x, scanEvents: [event, ...x.scanEvents] }
            : x,
        ),
      }))
      return event
    }

    if (session.mode === 'SSCC') {
      const other = findSsccOnOtherAsn(code.trim(), asn.id, state.asns)
      if (other && !asn.pallets.some((p) => p.sscc === code.trim())) {
        const event: ScanEvent = {
          id: uid('SCN'),
          code,
          kind: 'SSCC',
          result: 'BLOCK',
          errorType: 'WRONG_ASN',
          message: `SSCC belongs to ASN ${other.id}`,
          actionHint: 'Stop — wrong shipment for this session',
          ts: new Date().toISOString(),
        }
        set((s) => ({
          sessions: s.sessions.map((x) =>
            x.id === sessionId
              ? { ...x, scanEvents: [event, ...x.scanEvents] }
              : x,
          ),
          discrepancies: [
            ...s.discrepancies,
            {
              id: uid('DSC'),
              sessionId,
              asnId: asn.id,
              type: 'UNKNOWN',
              qty: 1,
              note: event.message,
              resolution: 'PENDING',
            },
          ],
        }))
        return event
      }
    }

    const validation = validateScan({
      code,
      session,
      asn,
      products: state.products,
      lot,
      expiry,
      allowOverOverride,
    })

    const event: ScanEvent = {
      id: uid('SCN'),
      code,
      kind: validation.kind,
      result: validation.result,
      errorType: validation.errorType,
      message: validation.message,
      actionHint: validation.actionHint,
      ts: new Date().toISOString(),
    }

    set((s) => {
      const applyOk =
        validation.result === 'OK' ||
        (validation.result === 'WARN' &&
          validation.errorType === 'OVER_RECEIPT' &&
          allowOverOverride)

      const nextSessions = s.sessions.map((x) => {
        if (x.id !== sessionId) return x
        if (!(applyOk && validation.apply?.lines)) {
          return { ...x, scanEvents: [event, ...x.scanEvents] }
        }
        return {
          ...x,
          scanEvents: [event, ...x.scanEvents],
          receivedLines: [
            ...x.receivedLines,
            ...validation.apply.lines.map((l) => ({ ...l })),
          ],
          receivedSsccs: validation.apply.sscc
            ? [...x.receivedSsccs, validation.apply.sscc]
            : x.receivedSsccs,
          scannedContainers: validation.apply.containerCode
            ? [...x.scannedContainers, validation.apply.containerCode]
            : x.scannedContainers,
        }
      })

      const nextAsns =
        applyOk && validation.apply?.lines
          ? s.asns.map((a) => {
              if (a.id !== asn.id) return a
              let updated = bumpAsnLines(a, validation.apply!.lines!)
              if (validation.apply?.sscc) {
                updated = {
                  ...updated,
                  pallets: updated.pallets.map((p) =>
                    p.sscc === validation.apply!.sscc
                      ? { ...p, received: true }
                      : p,
                  ),
                }
              }
              return updated
            })
          : s.asns

      const nextDiscrepancies =
        validation.apply?.createDiscrepancy && validation.result !== 'OK'
          ? [
              ...s.discrepancies,
              {
                id: uid('DSC'),
                sessionId,
                asnId: asn.id,
                type: validation.apply.createDiscrepancy.type,
                sku: validation.apply.createDiscrepancy.sku,
                qty: validation.apply.createDiscrepancy.qty,
                note: validation.apply.createDiscrepancy.note,
                resolution: 'PENDING' as const,
              },
            ]
          : s.discrepancies

      return {
        sessions: nextSessions,
        asns: nextAsns,
        discrepancies: nextDiscrepancies,
      }
    })

    return event
  },

  finishReceiving: (sessionId) => {
    const state = get()
    const session = state.sessions.find((s) => s.id === sessionId)
    if (!session) return
    const asn = state.asns.find((a) => a.id === session.asnId)
    if (!asn) return

    const shortDisc: Discrepancy[] = []
    for (const line of asn.lines) {
      const received = session.receivedLines
        .filter((l) => l.sku === line.sku && !l.quarantine)
        .reduce((sum, l) => sum + l.qty, 0)
      const short = line.expectedQty - received
      if (short <= 0) continue
      shortDisc.push({
        id: uid('DSC'),
        sessionId,
        asnId: asn.id,
        type: 'SHORT',
        sku: line.sku,
        qty: short,
        note: 'Short vs ASN expected',
        resolution: 'PENDING',
      })
    }

    set((s) => ({
      sessions: s.sessions.map((x) =>
        x.id === sessionId ? { ...x, status: 'QC' } : x,
      ),
      asns: s.asns.map((a) =>
        a.id === session.asnId ? { ...a, status: 'QC' } : a,
      ),
      discrepancies: [...s.discrepancies, ...shortDisc],
    }))
  },

  submitQc: ({ sessionId, sku, sampleQty, pass, reason }) => {
    const qc: QCResult = {
      id: uid('QC'),
      sessionId,
      sku,
      sampleQty,
      pass,
      reason,
    }

    set((s) => {
      const session = s.sessions.find((x) => x.id === sessionId)
      if (!session) return s

      let receivedLines = session.receivedLines
      let discrepancies = s.discrepancies
      let inventory = s.inventory

      if (!pass) {
        receivedLines = receivedLines.map((l) =>
          l.sku === sku ? { ...l, quarantine: true } : l,
        )
        discrepancies = [
          ...discrepancies,
          {
            id: uid('DSC'),
            sessionId,
            asnId: session.asnId,
            type: 'QC_FAIL',
            sku,
            qty: receivedLines
              .filter((l) => l.sku === sku)
              .reduce((sum, l) => sum + l.qty, 0),
            note: reason ?? 'QC failed',
            resolution: 'QUARANTINE',
          },
        ]
        inventory = inventory.map((inv) => {
          if (inv.sku !== sku) return inv
          const qty = receivedLines
            .filter((l) => l.sku === sku)
            .reduce((sum, l) => sum + l.qty, 0)
          return { ...inv, quarantine: inv.quarantine + qty }
        })
      }

      const pendingDisc = discrepancies.some(
        (d) => d.sessionId === sessionId && d.resolution === 'PENDING',
      )
      const nextStatus = pendingDisc || !pass ? 'DISCREPANCY' : 'PUTAWAY'

      return {
        qcResults: [...s.qcResults, qc],
        sessions: s.sessions.map((x) =>
          x.id === sessionId
            ? { ...x, status: nextStatus, receivedLines }
            : x,
        ),
        asns: s.asns.map((a) =>
          a.id === session.asnId ? { ...a, status: nextStatus } : a,
        ),
        discrepancies,
        inventory,
      }
    })
  },

  resolveDiscrepancy: (id, resolution, note) => {
    set((s) => {
      const disc = s.discrepancies.find((d) => d.id === id)
      if (!disc) return s

      const discrepancies = s.discrepancies.map((d) =>
        d.id === id
          ? { ...d, resolution, note: note ?? d.note }
          : d,
      )

      const session = s.sessions.find((x) => x.id === disc.sessionId)
      const stillPending = discrepancies.some(
        (d) => d.sessionId === disc.sessionId && d.resolution === 'PENDING',
      )

      if (!session || stillPending) {
        return { discrepancies }
      }

      return {
        discrepancies,
        sessions: s.sessions.map((x) =>
          x.id === session.id ? { ...x, status: 'PUTAWAY' } : x,
        ),
        asns: s.asns.map((a) =>
          a.id === session.asnId ? { ...a, status: 'PUTAWAY' } : a,
        ),
      }
    })
  },

  generatePutawayTasks: (sessionId) => {
    const state = get()
    const session = state.sessions.find((s) => s.id === sessionId)
    if (!session) return
    if (state.putawayTasks.some((t) => t.sessionId === sessionId)) return

    const grouped = new Map<string, { qty: number; quarantine: boolean }>()
    for (const line of session.receivedLines) {
      const key = `${line.sku}|${line.quarantine ? 'Q' : 'A'}`
      const prev = grouped.get(key) ?? { qty: 0, quarantine: !!line.quarantine }
      grouped.set(key, {
        qty: prev.qty + line.qty,
        quarantine: !!line.quarantine,
      })
    }

    const tasks: PutawayTask[] = [...grouped.entries()].map(([key, val]) => {
      const sku = key.split('|')[0]
      return {
        id: uid('PUT'),
        sessionId,
        asnId: session.asnId,
        sku,
        qty: val.qty,
        suggestedLocation: suggestLocation(sku, val.quarantine),
        status: 'PENDING',
        quarantine: val.quarantine,
      }
    })

    set((s) => ({
      putawayTasks: [...s.putawayTasks, ...tasks],
      sessions: s.sessions.map((x) =>
        x.id === sessionId ? { ...x, status: 'PUTAWAY' } : x,
      ),
      asns: s.asns.map((a) =>
        a.id === session.asnId ? { ...a, status: 'PUTAWAY' } : a,
      ),
    }))
  },

  confirmPutaway: (taskId) => {
    set((s) => {
      const task = s.putawayTasks.find((t) => t.id === taskId)
      if (!task || task.status === 'CONFIRMED') return s

      const putawayTasks = s.putawayTasks.map((t) =>
        t.id === taskId ? { ...t, status: 'CONFIRMED' as const } : t,
      )

      let inventory = s.inventory
      if (!task.quarantine) {
        inventory = s.inventory.map((inv) =>
          inv.sku === task.sku
            ? { ...inv, available: inv.available + task.qty }
            : inv,
        )
      }

      const sessionTasks = putawayTasks.filter((t) => t.sessionId === task.sessionId)
      const allDone = sessionTasks.every((t) => t.status === 'CONFIRMED')

      return {
        putawayTasks,
        inventory,
        sessions: allDone
          ? s.sessions.map((x) =>
              x.id === task.sessionId ? { ...x, status: 'COMPLETED' } : x,
            )
          : s.sessions,
        asns: allDone
          ? s.asns.map((a) =>
              a.id === task.asnId ? { ...a, status: 'COMPLETED' } : a,
            )
          : s.asns,
        docks: allDone
          ? s.docks.map((d) => {
              const session = s.sessions.find((x) => x.id === task.sessionId)
              return session && d.id === session.dockId
                ? { ...d, status: 'AVAILABLE' as const }
                : d
            })
          : s.docks,
      }
    })
  },
}))
