import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, In, Repository } from 'typeorm';
import { findSsccOnOtherAsn, validateScan } from './domain/scan';
import {
  canFinishReceiving,
  canGateInAsn,
  OVER_RECEIPT_TOLERANCE,
  resolveVarianceDiscrepancyType,
  suggestLocation,
  uid,
  willCauseSsccVariance,
  willCauseVariance,
  type AsnDto,
  type AsnStatus,
  type ProductDto,
  type ReceiptVarianceReasonId,
  type ReceivingSessionDto,
  type ScanEventDto,
  type SessionStatus,
} from './domain/types';
import { CreateAsnDto } from './dto/inbound.dto';
import {
  GateInDto,
  ResolveDiscrepancyDto,
  ScheduleAppointmentDto,
  ScanDto,
  SubmitQcDto,
} from './dto/receiving.dto';
import { Appointment } from './entities/appointment.entity';
import { AsnLine } from './entities/asn-line.entity';
import { AsnPallet } from './entities/asn-pallet.entity';
import { Asn } from './entities/asn.entity';
import { Discrepancy } from './entities/discrepancy.entity';
import { Dock } from './entities/dock.entity';
import { Inventory } from './entities/inventory.entity';
import { PalletItem } from './entities/pallet-item.entity';
import { Product } from './entities/product.entity';
import { PutawayTask } from './entities/putaway-task.entity';
import { QcResult } from './entities/qc-result.entity';
import { ReceivingSession } from './entities/receiving-session.entity';
import { ScanEvent } from './entities/scan-event.entity';
import { SessionContainer } from './entities/session-container.entity';
import { SessionReceivedLine } from './entities/session-received-line.entity';
import { SessionSscc } from './entities/session-sscc.entity';
import { Supplier } from './entities/supplier.entity';

@Injectable()
export class ReceivingService {
  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(Supplier)
    private readonly suppliersRepo: Repository<Supplier>,
    @InjectRepository(Product)
    private readonly productsRepo: Repository<Product>,
    @InjectRepository(Asn)
    private readonly asnsRepo: Repository<Asn>,
    @InjectRepository(AsnLine)
    private readonly asnLinesRepo: Repository<AsnLine>,
    @InjectRepository(AsnPallet)
    private readonly asnPalletsRepo: Repository<AsnPallet>,
    @InjectRepository(PalletItem)
    private readonly palletItemsRepo: Repository<PalletItem>,
    @InjectRepository(Dock)
    private readonly docksRepo: Repository<Dock>,
    @InjectRepository(Appointment)
    private readonly appointmentsRepo: Repository<Appointment>,
    @InjectRepository(ReceivingSession)
    private readonly sessionsRepo: Repository<ReceivingSession>,
    @InjectRepository(SessionReceivedLine)
    private readonly receivedLinesRepo: Repository<SessionReceivedLine>,
    @InjectRepository(ScanEvent)
    private readonly scanEventsRepo: Repository<ScanEvent>,
    @InjectRepository(SessionSscc)
    private readonly sessionSsccsRepo: Repository<SessionSscc>,
    @InjectRepository(SessionContainer)
    private readonly sessionContainersRepo: Repository<SessionContainer>,
    @InjectRepository(Discrepancy)
    private readonly discrepanciesRepo: Repository<Discrepancy>,
    @InjectRepository(QcResult)
    private readonly qcResultsRepo: Repository<QcResult>,
    @InjectRepository(PutawayTask)
    private readonly putawayTasksRepo: Repository<PutawayTask>,
    @InjectRepository(Inventory)
    private readonly inventoryRepo: Repository<Inventory>,
  ) {}

  listSuppliers() {
    return this.suppliersRepo
      .find({ order: { id: 'ASC' } })
      .then((rows) => rows.map((s) => ({ id: s.id, name: s.name })));
  }

  listProducts(): Promise<ProductDto[]> {
    return this.productsRepo.find({ order: { sku: 'ASC' } }).then((rows) =>
      rows.map((p) => ({
        sku: p.sku,
        name: p.name,
        uom: p.uom,
        requiresLotExpiry: p.requiresLotExpiry,
        shelfLifeDays: p.shelfLifeDays ?? undefined,
      })),
    );
  }

  async listAsns(): Promise<AsnDto[]> {
    const asns = await this.asnsRepo.find({
      relations: { lines: true, pallets: { items: true } },
      order: { id: 'ASC' },
    });
    return asns.map((a) => this.toAsnDto(a));
  }

  async getAsn(id: string): Promise<AsnDto> {
    const asn = await this.asnsRepo.findOne({
      where: { id },
      relations: { lines: true, pallets: { items: true } },
    });
    if (!asn) throw new NotFoundException(`ASN ${id} not found`);
    return this.toAsnDto(asn);
  }

  async createAsn(dto: CreateAsnDto): Promise<AsnDto> {
    const supplier = await this.suppliersRepo.findOne({
      where: { id: dto.supplierId },
    });
    if (!supplier) {
      throw new BadRequestException(`Supplier ${dto.supplierId} not found`);
    }

    for (const line of dto.lines) {
      const product = await this.productsRepo.findOne({
        where: { sku: line.sku },
      });
      if (!product) {
        throw new BadRequestException(`Product ${line.sku} not found`);
      }
    }

    const id = dto.id?.trim() || uid('ASN');
    const existing = await this.asnsRepo.findOne({ where: { id } });
    if (existing) {
      throw new BadRequestException(`ASN ${id} already exists`);
    }

    await this.dataSource.transaction(async (manager) => {
      await manager.save(
        Asn,
        manager.create(Asn, {
          id,
          supplierId: dto.supplierId,
          type: dto.type,
          carrier: dto.carrier,
          plateNo: dto.plateNo,
          status: 'EXPECTED',
          eta: new Date(),
        }),
      );

      for (const line of dto.lines) {
        await manager.save(
          AsnLine,
          manager.create(AsnLine, {
            asnId: id,
            sku: line.sku,
            expectedQty: line.expectedQty,
            receivedQty: 0,
          }),
        );
      }

      if (dto.type === 'SSCC' && dto.pallets?.length) {
        for (const pallet of dto.pallets) {
          await manager.save(
            AsnPallet,
            manager.create(AsnPallet, {
              sscc: pallet.sscc,
              asnId: id,
              destinationWh: pallet.destinationWh || 'WH-01',
              blocked: false,
              damaged: false,
              received: false,
            }),
          );
          for (const item of pallet.items) {
            await manager.save(
              PalletItem,
              manager.create(PalletItem, {
                sscc: pallet.sscc,
                sku: item.sku,
                qty: item.qty,
                lot: item.lot ?? null,
                expiry: item.expiry ?? null,
              }),
            );
          }
        }
      }
    });

    return this.getAsn(id);
  }

  listDocks() {
    return this.docksRepo
      .find({ order: { id: 'ASC' } })
      .then((rows) =>
        rows.map((d) => ({ id: d.id, name: d.name, status: d.status })),
      );
  }

  listAppointments() {
    return this.appointmentsRepo.find({ order: { id: 'ASC' } }).then((rows) =>
      rows.map((a) => ({
        id: a.id,
        asnId: a.asnId,
        dockId: a.dockId,
        windowStart: a.windowStart.toISOString(),
        windowEnd: a.windowEnd.toISOString(),
        status: a.status,
      })),
    );
  }

  async scheduleAppointment(dto: ScheduleAppointmentDto) {
    const dock = await this.docksRepo.findOne({ where: { id: dto.dockId } });
    const asn = await this.asnsRepo.findOne({ where: { id: dto.asnId } });
    if (!dock || !asn) {
      return { ok: false as const, message: 'Dock or ASN not found' };
    }
    if (dock.status === 'BLOCKED') {
      return { ok: false as const, message: 'Dock is blocked' };
    }
    if (!['EXPECTED', 'SCHEDULED'].includes(asn.status)) {
      return {
        ok: false as const,
        message: `ASN status ${asn.status} cannot be scheduled`,
      };
    }

    const appointmentId = uid('APT');
    await this.dataSource.transaction(async (manager) => {
      await manager.save(
        Appointment,
        manager.create(Appointment, {
          id: appointmentId,
          asnId: dto.asnId,
          dockId: dto.dockId,
          windowStart: new Date(dto.windowStart),
          windowEnd: new Date(dto.windowEnd),
          status: 'BOOKED',
        }),
      );
      await manager.update(Asn, { id: dto.asnId }, { status: 'SCHEDULED' });
    });

    return {
      ok: true as const,
      message: 'Appointment booked',
      appointmentId,
    };
  }

  async listSessions(): Promise<ReceivingSessionDto[]> {
    const sessions = await this.sessionsRepo.find({ order: { id: 'ASC' } });
    return Promise.all(sessions.map((s) => this.toSessionDto(s)));
  }

  async getSession(id: string): Promise<ReceivingSessionDto> {
    const session = await this.sessionsRepo.findOne({ where: { id } });
    if (!session) throw new NotFoundException(`Session ${id} not found`);
    return this.toSessionDto(session);
  }

  async gateIn(dto: GateInDto) {
    const dock = await this.docksRepo.findOne({ where: { id: dto.dockId } });
    if (!dock) return { ok: false as const, message: 'Dock not found' };
    if (dock.status === 'OCCUPIED') {
      return { ok: false as const, message: 'Dock already occupied' };
    }
    if (dock.status === 'BLOCKED') {
      return { ok: false as const, message: 'Dock is blocked' };
    }

    const appointment = dto.appointmentId
      ? await this.appointmentsRepo.findOne({
          where: { id: dto.appointmentId },
        })
      : null;

    if (appointment && appointment.status !== 'BOOKED') {
      return {
        ok: false as const,
        message: `Appointment is ${appointment.status} — book a new appointment`,
      };
    }

    let asn = dto.asnId
      ? await this.asnsRepo.findOne({
          where: { id: dto.asnId },
          relations: { lines: true, pallets: { items: true } },
        })
      : appointment
        ? await this.asnsRepo.findOne({
            where: { id: appointment.asnId },
            relations: { lines: true, pallets: { items: true } },
          })
        : null;

    let unknownArrival = false;
    if (asn) {
      if (asn.plateNo.toUpperCase() !== dto.plateNo.trim().toUpperCase()) {
        unknownArrival = true;
      }
    } else {
      const allAsns = await this.asnsRepo.find({
        relations: { lines: true, pallets: { items: true } },
      });
      const plate = dto.plateNo.trim().toUpperCase();
      const byPlate = allAsns.find((a) => a.plateNo.toUpperCase() === plate);
      if (byPlate) {
        asn = byPlate;
      } else {
        unknownArrival = true;
      }
    }

    if (asn) {
      const gate = canGateInAsn({ status: asn.status as AsnStatus });
      if (!gate.ok) return { ok: false as const, message: gate.message };
      if (appointment && appointment.asnId !== asn.id) {
        return {
          ok: false as const,
          message: 'Appointment does not match ASN',
        };
      }
    }

    const sessionId = uid('SES');

    if (!asn) {
      await this.dataSource.transaction(async (manager) => {
        await manager.save(
          ReceivingSession,
          manager.create(ReceivingSession, {
            id: sessionId,
            asnId: 'UNKNOWN',
            dockId: dto.dockId,
            mode: 'CONTAINER',
            status: 'GATE_IN',
            plateNoEntered: dto.plateNo,
            unknownArrival: true,
            supervisorApproved: false,
          }),
        );
        await manager.update(Dock, { id: dto.dockId }, { status: 'OCCUPIED' });
      });
      return {
        ok: true as const,
        message: 'Unscheduled / unknown arrival — supervisor action required',
        sessionId,
        unknownArrival: true,
      };
    }

    await this.dataSource.transaction(async (manager) => {
      await manager.save(
        ReceivingSession,
        manager.create(ReceivingSession, {
          id: sessionId,
          asnId: asn.id,
          dockId: dto.dockId,
          mode: asn.type,
          status: 'GATE_IN',
          plateNoEntered: dto.plateNo,
          unknownArrival,
          supervisorApproved: false,
        }),
      );
      await manager.update(Dock, { id: dto.dockId }, { status: 'OCCUPIED' });
      await manager.update(Asn, { id: asn.id }, { status: 'GATE_IN' });
      if (appointment) {
        await manager.update(
          Appointment,
          { id: appointment.id },
          { status: 'ARRIVED' },
        );
      }
    });

    return {
      ok: true as const,
      message: unknownArrival
        ? 'Plate mismatch — treat as unknown arrival'
        : 'Gate-in successful',
      sessionId,
      unknownArrival,
    };
  }

  async rejectArrival(sessionId: string, reason: string) {
    const session = await this.sessionsRepo.findOne({
      where: { id: sessionId },
    });
    if (!session) throw new NotFoundException(`Session ${sessionId} not found`);

    await this.dataSource.transaction(async (manager) => {
      await manager.update(
        ReceivingSession,
        { id: sessionId },
        { status: 'REJECTED' },
      );
      await manager.update(
        Dock,
        { id: session.dockId },
        { status: 'AVAILABLE' },
      );
      if (session.asnId !== 'UNKNOWN') {
        await manager.update(
          Asn,
          { id: session.asnId },
          { status: 'REJECTED' },
        );
      }
      await manager.save(
        Discrepancy,
        manager.create(Discrepancy, {
          id: uid('DSC'),
          sessionId,
          asnId: session.asnId,
          type: 'UNKNOWN',
          qty: 0,
          note: reason,
          resolution: 'REJECT',
        }),
      );
    });

    return { ok: true as const };
  }

  async approveUnknownArrival(sessionId: string) {
    const session = await this.sessionsRepo.findOne({
      where: { id: sessionId },
    });
    if (!session) throw new NotFoundException(`Session ${sessionId} not found`);
    await this.sessionsRepo.update(
      { id: sessionId },
      { supervisorApproved: true, unknownArrival: false },
    );
    return { ok: true as const };
  }

  async startUnload(sessionId: string) {
    const session = await this.sessionsRepo.findOne({
      where: { id: sessionId },
    });
    if (!session || session.asnId === 'UNKNOWN') {
      return { ok: false as const, message: 'Cannot start unload' };
    }
    if (session.unknownArrival && !session.supervisorApproved) {
      return {
        ok: false as const,
        message: 'Supervisor approval required',
      };
    }
    await this.dataSource.transaction(async (manager) => {
      await manager.update(
        ReceivingSession,
        { id: sessionId },
        { status: 'UNLOADING' },
      );
      await manager.update(Asn, { id: session.asnId }, { status: 'UNLOADING' });
    });
    return { ok: true as const };
  }

  async startReceiving(sessionId: string) {
    const session = await this.sessionsRepo.findOne({
      where: { id: sessionId },
    });
    if (!session) throw new NotFoundException(`Session ${sessionId} not found`);
    await this.dataSource.transaction(async (manager) => {
      await manager.update(
        ReceivingSession,
        { id: sessionId },
        { status: 'RECEIVING' },
      );
      if (session.asnId !== 'UNKNOWN') {
        await manager.update(
          Asn,
          { id: session.asnId },
          { status: 'RECEIVING' },
        );
      }
    });
    return { ok: true as const };
  }

  async scan(sessionId: string, dto: ScanDto): Promise<ScanEventDto> {
    const sessionEntity = await this.sessionsRepo.findOne({
      where: { id: sessionId },
    });
    if (!sessionEntity) {
      return {
        id: uid('SCN'),
        code: dto.code,
        kind: 'SKU',
        result: 'BLOCK',
        errorType: 'NO_SESSION',
        message: 'Session not found',
        ts: new Date().toISOString(),
      };
    }

    const session = await this.toSessionDto(sessionEntity);
    const asnEntity =
      session.asnId === 'UNKNOWN'
        ? null
        : await this.asnsRepo.findOne({
            where: { id: session.asnId },
            relations: { lines: true, pallets: { items: true } },
          });

    if (!asnEntity) {
      const event: ScanEventDto = {
        id: uid('SCN'),
        code: dto.code,
        kind: 'SKU',
        result: 'BLOCK',
        errorType: 'NO_ASN',
        message: 'No ASN linked — cannot receive',
        actionHint: 'Reject arrival or link ASN via supervisor',
        ts: new Date().toISOString(),
      };
      await this.persistScanEvent(sessionId, event);
      return event;
    }

    const asn = this.toAsnDto(asnEntity);
    const allAsns = await this.listAsns();
    const products = await this.listProducts();

    if (session.mode === 'SSCC') {
      const other = findSsccOnOtherAsn(dto.code.trim(), asn.id, allAsns);
      if (other && !asn.pallets.some((p) => p.sscc === dto.code.trim())) {
        const event: ScanEventDto = {
          id: uid('SCN'),
          code: dto.code,
          kind: 'SSCC',
          result: 'BLOCK',
          errorType: 'WRONG_ASN',
          message: `SSCC belongs to ASN ${other.id}`,
          actionHint: 'Stop — wrong shipment for this session',
          ts: new Date().toISOString(),
        };
        await this.dataSource.transaction(async (manager) => {
          await this.persistScanEventTx(manager, sessionId, event);
          await manager.save(
            Discrepancy,
            manager.create(Discrepancy, {
              id: uid('DSC'),
              sessionId,
              asnId: asn.id,
              type: 'UNKNOWN',
              qty: 1,
              note: event.message,
              resolution: 'PENDING',
            }),
          );
        });
        return event;
      }
    }

    const validation = validateScan({
      code: dto.code,
      session,
      asn,
      products,
      lot: dto.lot,
      expiry: dto.expiry,
      qty: dto.qty,
      lines: dto.lines,
      varianceReason: dto.varianceReason,
      confirm: dto.confirm,
      allowOverOverride: dto.allowOverOverride,
    });

    const event: ScanEventDto = {
      id: uid('SCN'),
      code: dto.code,
      kind: validation.kind,
      result: validation.result,
      errorType: validation.errorType,
      message: validation.message,
      actionHint: validation.actionHint,
      ts: new Date().toISOString(),
    };

    if (!dto.confirm) {
      return event;
    }

    const applyOk =
      validation.result === 'OK' ||
      (validation.result === 'WARN' &&
        validation.errorType === 'OVER_RECEIPT' &&
        dto.allowOverOverride);

    await this.dataSource.transaction(async (manager) => {
      await this.persistScanEventTx(manager, sessionId, event);

      if (applyOk && validation.apply?.lines) {
        for (const line of validation.apply.lines) {
          await manager.save(
            SessionReceivedLine,
            manager.create(SessionReceivedLine, {
              sessionId,
              sku: line.sku,
              qty: line.qty,
              lot: line.lot ?? null,
              expiry: line.expiry ?? null,
              quarantine: false,
            }),
          );
          await manager.increment(
            AsnLine,
            { asnId: asn.id, sku: line.sku },
            'receivedQty',
            line.qty,
          );
        }
        if (validation.apply.sscc) {
          await manager.save(
            SessionSscc,
            manager.create(SessionSscc, {
              sessionId,
              sscc: validation.apply.sscc,
            }),
          );
          await manager.update(
            AsnPallet,
            { sscc: validation.apply.sscc },
            { received: true },
          );
        }
        if (validation.apply.containerCode) {
          await manager.save(
            SessionContainer,
            manager.create(SessionContainer, {
              sessionId,
              containerCode: validation.apply.containerCode,
            }),
          );
        }
      }

      if (validation.apply?.createDiscrepancy && validation.result !== 'OK') {
        await manager.save(
          Discrepancy,
          manager.create(Discrepancy, {
            id: uid('DSC'),
            sessionId,
            asnId: asn.id,
            type: validation.apply.createDiscrepancy.type,
            sku: validation.apply.createDiscrepancy.sku ?? null,
            qty: validation.apply.createDiscrepancy.qty,
            note: validation.apply.createDiscrepancy.note ?? null,
            resolution: 'PENDING',
          }),
        );
      }

      if (applyOk && validation.apply?.lines && dto.varianceReason?.trim()) {
        const pallet =
          session.mode === 'SSCC' && validation.apply.sscc
            ? asn.pallets.find((p) => p.sscc === validation.apply!.sscc)
            : undefined;
        for (const line of validation.apply.lines) {
          const manifestQty = pallet?.items.find(
            (i) => i.sku === line.sku,
          )?.qty;
          const check =
            session.mode === 'SSCC'
              ? willCauseSsccVariance(
                  asn,
                  session,
                  line.sku,
                  line.qty,
                  manifestQty,
                )
              : willCauseVariance(asn, session, line.sku, line.qty);
          if (!check.hasVariance) continue;
          const maxAllowed = check.expected * (1 + OVER_RECEIPT_TOLERANCE);
          const varianceQty =
            session.mode === 'SSCC' &&
            manifestQty !== undefined &&
            line.qty !== manifestQty
              ? Math.abs(line.qty - manifestQty)
              : check.next > maxAllowed
                ? check.next - maxAllowed
                : Math.abs(check.gap);
          await manager.save(
            Discrepancy,
            manager.create(Discrepancy, {
              id: uid('DSC'),
              sessionId,
              asnId: asn.id,
              type: resolveVarianceDiscrepancyType(
                dto.varianceReasonId as ReceiptVarianceReasonId | undefined,
                check.gap,
              ),
              sku: line.sku,
              qty: varianceQty,
              note: dto.varianceReason.trim(),
              resolution: 'PENDING',
            }),
          );
        }
      }
    });

    return event;
  }

  async finishReceiving(sessionId: string) {
    const sessionEntity = await this.sessionsRepo.findOne({
      where: { id: sessionId },
    });
    if (!sessionEntity)
      return { ok: false as const, message: 'Session not found' };
    const session = await this.toSessionDto(sessionEntity);
    const asn = await this.getAsn(session.asnId).catch(() => null);
    if (!asn) return { ok: false as const, message: 'ASN not found' };

    const gate = canFinishReceiving(session);
    if (!gate.ok) return gate;

    const existingDiscs = await this.discrepanciesRepo.find({
      where: { sessionId },
    });

    await this.dataSource.transaction(async (manager) => {
      for (const line of asn.lines) {
        const received = session.receivedLines
          .filter((l) => l.sku === line.sku && !l.quarantine)
          .reduce((sum, l) => sum + l.qty, 0);
        const short = line.expectedQty - received;
        if (short <= 0) continue;
        const alreadyLogged = existingDiscs.some(
          (d) =>
            d.sku === line.sku &&
            d.type === 'SHORT' &&
            d.resolution === 'PENDING',
        );
        if (alreadyLogged) continue;
        await manager.save(
          Discrepancy,
          manager.create(Discrepancy, {
            id: uid('DSC'),
            sessionId,
            asnId: asn.id,
            type: 'SHORT',
            sku: line.sku,
            qty: short,
            note: 'Short vs ASN expected',
            resolution: 'PENDING',
          }),
        );
      }
      await manager.update(
        ReceivingSession,
        { id: sessionId },
        { status: 'QC' },
      );
      await manager.update(Asn, { id: asn.id }, { status: 'QC' });
    });

    const shortCount = asn.lines.filter((line) => {
      const received = session.receivedLines
        .filter((l) => l.sku === line.sku && !l.quarantine)
        .reduce((sum, l) => sum + l.qty, 0);
      return line.expectedQty - received > 0;
    }).length;

    return {
      ok: true as const,
      message:
        shortCount > 0
          ? 'Receiving closed with short variance'
          : 'Receiving closed',
    };
  }

  listQcResults() {
    return this.qcResultsRepo.find({ order: { id: 'ASC' } }).then((rows) =>
      rows.map((q) => ({
        id: q.id,
        sessionId: q.sessionId,
        sku: q.sku,
        sampleQty: q.sampleQty,
        pass: q.pass,
        reason: q.reason ?? undefined,
      })),
    );
  }

  async submitQc(sessionId: string, dto: SubmitQcDto) {
    const session = await this.sessionsRepo.findOne({
      where: { id: sessionId },
    });
    if (!session) return { ok: false as const, message: 'Session not found' };

    const existing = await this.qcResultsRepo.findOne({
      where: { sessionId, sku: dto.sku },
    });
    if (existing) {
      return {
        ok: false as const,
        message: `QC already recorded for ${dto.sku} on this session`,
      };
    }

    const qcId = uid('QC');
    await this.dataSource.transaction(async (manager) => {
      await manager.save(
        QcResult,
        manager.create(QcResult, {
          id: qcId,
          sessionId,
          sku: dto.sku,
          sampleQty: dto.sampleQty,
          pass: dto.pass,
          reason: dto.reason ?? null,
        }),
      );

      let nextStatus: SessionStatus | AsnStatus = 'PUTAWAY';

      if (!dto.pass) {
        await manager.update(
          SessionReceivedLine,
          { sessionId, sku: dto.sku },
          { quarantine: true },
        );
        const lines = await manager.find(SessionReceivedLine, {
          where: { sessionId, sku: dto.sku },
        });
        const qty = lines.reduce((sum, l) => sum + l.qty, 0);
        await manager.save(
          Discrepancy,
          manager.create(Discrepancy, {
            id: uid('DSC'),
            sessionId,
            asnId: session.asnId,
            type: 'QC_FAIL',
            sku: dto.sku,
            qty,
            note: dto.reason ?? 'QC failed',
            resolution: 'QUARANTINE',
          }),
        );
        await manager.increment(Inventory, { sku: dto.sku }, 'quarantine', qty);
        nextStatus = 'DISCREPANCY';
      } else {
        const pending = await manager.count(Discrepancy, {
          where: { sessionId, resolution: 'PENDING' },
        });
        if (pending > 0) nextStatus = 'DISCREPANCY';
      }

      await manager.update(
        ReceivingSession,
        { id: sessionId },
        { status: nextStatus },
      );
      if (session.asnId !== 'UNKNOWN') {
        await manager.update(
          Asn,
          { id: session.asnId },
          { status: nextStatus },
        );
      }
    });

    return {
      ok: true as const,
      message: dto.pass
        ? `${dto.sku} accepted`
        : `${dto.sku} moved to quarantine`,
    };
  }

  listDiscrepancies() {
    return this.discrepanciesRepo.find({ order: { id: 'ASC' } }).then((rows) =>
      rows.map((d) => ({
        id: d.id,
        sessionId: d.sessionId,
        asnId: d.asnId,
        type: d.type,
        sku: d.sku ?? undefined,
        qty: d.qty,
        note: d.note ?? undefined,
        resolution: d.resolution,
      })),
    );
  }

  async resolveDiscrepancy(id: string, dto: ResolveDiscrepancyDto) {
    const disc = await this.discrepanciesRepo.findOne({ where: { id } });
    if (!disc) throw new NotFoundException(`Discrepancy ${id} not found`);

    await this.dataSource.transaction(async (manager) => {
      await manager.update(
        Discrepancy,
        { id },
        { resolution: dto.resolution, note: dto.note ?? disc.note },
      );
      const pending = await manager.count(Discrepancy, {
        where: { sessionId: disc.sessionId, resolution: 'PENDING' },
      });
      if (pending === 0) {
        const session = await manager.findOne(ReceivingSession, {
          where: { id: disc.sessionId },
        });
        if (session) {
          await manager.update(
            ReceivingSession,
            { id: session.id },
            { status: 'PUTAWAY' },
          );
          if (session.asnId !== 'UNKNOWN') {
            await manager.update(
              Asn,
              { id: session.asnId },
              { status: 'PUTAWAY' },
            );
          }
        }
      }
    });

    return { ok: true as const };
  }

  listPutawayTasks() {
    return this.putawayTasksRepo.find({ order: { id: 'ASC' } }).then((rows) =>
      rows.map((t) => ({
        id: t.id,
        sessionId: t.sessionId,
        asnId: t.asnId,
        sscc: t.sscc ?? undefined,
        sku: t.sku,
        qty: t.qty,
        suggestedLocation: t.suggestedLocation,
        status: t.status,
        quarantine: t.quarantine,
      })),
    );
  }

  async generatePutawayTasks(sessionId: string) {
    const sessionEntity = await this.sessionsRepo.findOne({
      where: { id: sessionId },
    });
    if (!sessionEntity)
      throw new NotFoundException(`Session ${sessionId} not found`);

    const existing = await this.putawayTasksRepo.count({
      where: { sessionId },
    });
    if (existing > 0) {
      return { ok: true as const, message: 'Tasks already generated' };
    }

    const session = await this.toSessionDto(sessionEntity);
    const grouped = new Map<string, { qty: number; quarantine: boolean }>();
    for (const line of session.receivedLines) {
      const key = `${line.sku}|${line.quarantine ? 'Q' : 'A'}`;
      const prev = grouped.get(key) ?? {
        qty: 0,
        quarantine: !!line.quarantine,
      };
      grouped.set(key, {
        qty: prev.qty + line.qty,
        quarantine: !!line.quarantine,
      });
    }

    await this.dataSource.transaction(async (manager) => {
      for (const [key, val] of grouped.entries()) {
        const sku = key.split('|')[0];
        await manager.save(
          PutawayTask,
          manager.create(PutawayTask, {
            id: uid('PUT'),
            sessionId,
            asnId: session.asnId,
            sku,
            qty: val.qty,
            suggestedLocation: suggestLocation(sku, val.quarantine),
            status: 'PENDING',
            quarantine: val.quarantine,
          }),
        );
      }
      await manager.update(
        ReceivingSession,
        { id: sessionId },
        { status: 'PUTAWAY' },
      );
      if (session.asnId !== 'UNKNOWN') {
        await manager.update(Asn, { id: session.asnId }, { status: 'PUTAWAY' });
      }
    });

    return { ok: true as const };
  }

  async confirmPutaway(taskId: string) {
    const task = await this.putawayTasksRepo.findOne({ where: { id: taskId } });
    if (!task) throw new NotFoundException(`Putaway task ${taskId} not found`);

    let alreadyConfirmed = task.status === 'CONFIRMED';

    await this.dataSource.transaction(async (manager) => {
      await manager.findOne(ReceivingSession, {
        where: { id: task.sessionId },
        lock: { mode: 'pessimistic_write' },
      });

      const current = await manager.findOne(PutawayTask, {
        where: { id: taskId },
      });
      if (!current) {
        throw new NotFoundException(`Putaway task ${taskId} not found`);
      }

      if (current.status !== 'CONFIRMED') {
        await manager.update(
          PutawayTask,
          { id: taskId },
          { status: 'CONFIRMED' },
        );
        if (!current.quarantine) {
          await manager.increment(
            Inventory,
            { sku: current.sku },
            'available',
            current.qty,
          );
        }
      } else {
        alreadyConfirmed = true;
      }

      await this.completeReceivingSessionIfReady(manager, task.sessionId);
    });

    return alreadyConfirmed
      ? ({ ok: true as const, message: 'Already confirmed' } as const)
      : ({ ok: true as const } as const);
  }

  private async completeReceivingSessionIfReady(
    manager: EntityManager,
    sessionId: string,
  ): Promise<void> {
    const pending = await manager.count(PutawayTask, {
      where: { sessionId, status: 'PENDING' },
    });
    if (pending > 0) return;

    const session = await manager.findOne(ReceivingSession, {
      where: { id: sessionId },
    });
    if (!session || ['COMPLETED', 'REJECTED'].includes(session.status)) {
      return;
    }

    await manager.update(
      ReceivingSession,
      { id: sessionId },
      { status: 'COMPLETED' },
    );
    if (session.asnId !== 'UNKNOWN') {
      await manager.update(Asn, { id: session.asnId }, { status: 'COMPLETED' });
      await manager.update(
        Appointment,
        {
          asnId: session.asnId,
          status: In(['BOOKED', 'ARRIVED']),
        },
        { status: 'COMPLETED' },
      );
    }
    await manager.update(Dock, { id: session.dockId }, { status: 'AVAILABLE' });
  }

  listInventory() {
    return this.inventoryRepo.find({ order: { sku: 'ASC' } }).then((rows) =>
      rows.map((i) => ({
        sku: i.sku,
        available: i.available,
        quarantine: i.quarantine,
      })),
    );
  }

  private toAsnDto(asn: Asn): AsnDto {
    return {
      id: asn.id,
      supplierId: asn.supplierId,
      type: asn.type as AsnDto['type'],
      carrier: asn.carrier,
      plateNo: asn.plateNo,
      status: asn.status as AsnStatus,
      eta: asn.eta?.toISOString(),
      lines: (asn.lines ?? []).map((l) => ({
        sku: l.sku,
        expectedQty: l.expectedQty,
        receivedQty: l.receivedQty,
      })),
      pallets: (asn.pallets ?? []).map((p) => ({
        sscc: p.sscc,
        destinationWh: p.destinationWh,
        blocked: p.blocked,
        damaged: p.damaged,
        received: p.received,
        items: (p.items ?? []).map((i) => ({
          sku: i.sku,
          qty: i.qty,
          lot: i.lot ?? undefined,
          expiry: i.expiry ?? undefined,
        })),
      })),
    };
  }

  private async toSessionDto(
    session: ReceivingSession,
  ): Promise<ReceivingSessionDto> {
    const [receivedLines, scanEvents, ssccs, containers] = await Promise.all([
      this.receivedLinesRepo.find({ where: { sessionId: session.id } }),
      this.scanEventsRepo.find({
        where: { sessionId: session.id },
        order: { ts: 'DESC' },
      }),
      this.sessionSsccsRepo.find({ where: { sessionId: session.id } }),
      this.sessionContainersRepo.find({ where: { sessionId: session.id } }),
    ]);

    return {
      id: session.id,
      asnId: session.asnId,
      dockId: session.dockId,
      mode: session.mode as ReceivingSessionDto['mode'],
      status: session.status as SessionStatus,
      plateNoEntered: session.plateNoEntered ?? undefined,
      unknownArrival: session.unknownArrival,
      supervisorApproved: session.supervisorApproved,
      receivedLines: receivedLines.map((l) => ({
        sku: l.sku,
        qty: l.qty,
        lot: l.lot ?? undefined,
        expiry: l.expiry ?? undefined,
        quarantine: l.quarantine,
      })),
      scanEvents: scanEvents.map((e) => ({
        id: e.id,
        code: e.code,
        kind: e.kind as ScanEventDto['kind'],
        result: e.result as ScanEventDto['result'],
        errorType: e.errorType ?? undefined,
        message: e.message,
        actionHint: e.actionHint ?? undefined,
        ts: e.ts.toISOString(),
      })),
      receivedSsccs: ssccs.map((s) => s.sscc),
      scannedContainers: containers.map((c) => c.containerCode),
    };
  }

  private async persistScanEvent(sessionId: string, event: ScanEventDto) {
    await this.scanEventsRepo.save(
      this.scanEventsRepo.create({
        id: event.id,
        sessionId,
        code: event.code,
        kind: event.kind,
        result: event.result,
        errorType: event.errorType ?? null,
        message: event.message,
        actionHint: event.actionHint ?? null,
        ts: new Date(event.ts),
      }),
    );
  }

  private async persistScanEventTx(
    manager: import('typeorm').EntityManager,
    sessionId: string,
    event: ScanEventDto,
  ) {
    await manager.save(
      ScanEvent,
      manager.create(ScanEvent, {
        id: event.id,
        sessionId,
        code: event.code,
        kind: event.kind,
        result: event.result,
        errorType: event.errorType ?? null,
        message: event.message,
        actionHint: event.actionHint ?? null,
        ts: new Date(event.ts),
      }),
    );
  }
}
