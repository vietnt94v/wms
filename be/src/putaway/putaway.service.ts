import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, In, Repository } from 'typeorm';
import { uid } from '../receiving/domain/types';
import { Appointment } from '../receiving/entities/appointment.entity';
import { AsnPallet } from '../receiving/entities/asn-pallet.entity';
import { Asn } from '../receiving/entities/asn.entity';
import { Discrepancy } from '../receiving/entities/discrepancy.entity';
import { Dock } from '../receiving/entities/dock.entity';
import { Inventory } from '../receiving/entities/inventory.entity';
import { QcResult } from '../receiving/entities/qc-result.entity';
import { ReceivingSession } from '../receiving/entities/receiving-session.entity';
import { SessionContainer } from '../receiving/entities/session-container.entity';
import { SessionReceivedLine } from '../receiving/entities/session-received-line.entity';
import { SessionSscc } from '../receiving/entities/session-sscc.entity';
import { allocateLocation } from './domain/location-allocator';
import { ConfirmPutawayDto } from './dto/putaway.dto';
import { LocationInventory } from './entities/location-inventory.entity';
import { PutawayTaskLine } from './entities/putaway-task-line.entity';
import { PutawayTask } from './entities/putaway-task.entity';

@Injectable()
export class PutawayService {
  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(PutawayTask)
    private readonly putawayTasksRepo: Repository<PutawayTask>,
    @InjectRepository(ReceivingSession)
    private readonly sessionsRepo: Repository<ReceivingSession>,
    @InjectRepository(SessionReceivedLine)
    private readonly receivedLinesRepo: Repository<SessionReceivedLine>,
    @InjectRepository(SessionSscc)
    private readonly sessionSsccsRepo: Repository<SessionSscc>,
    @InjectRepository(SessionContainer)
    private readonly sessionContainersRepo: Repository<SessionContainer>,
    @InjectRepository(AsnPallet)
    private readonly asnPalletsRepo: Repository<AsnPallet>,
    @InjectRepository(Discrepancy)
    private readonly discrepanciesRepo: Repository<Discrepancy>,
    @InjectRepository(QcResult)
    private readonly qcResultsRepo: Repository<QcResult>,
  ) {}

  listTasks(status?: string) {
    const where = status ? { status } : {};
    return this.putawayTasksRepo
      .find({
        where,
        relations: { lines: true },
        order: { id: 'ASC' },
      })
      .then((rows) => rows.map((t) => this.toTaskDto(t)));
  }

  async getTask(id: string) {
    const task = await this.putawayTasksRepo.findOne({
      where: { id },
      relations: { lines: true },
    });
    if (!task) throw new NotFoundException(`Putaway task ${id} not found`);
    return this.toTaskDto(task);
  }

  async tryGenerateTasks(sessionId: string) {
    const ready = await this.isReadyForPutaway(sessionId);
    if (!ready) {
      return { ok: false as const, message: 'Session not ready for putaway' };
    }
    return this.generatePutawayTasks(sessionId);
  }

  async isReadyForPutaway(sessionId: string): Promise<boolean> {
    const session = await this.sessionsRepo.findOne({ where: { id: sessionId } });
    if (!session) return false;
    if (['COMPLETED', 'REJECTED'].includes(session.status)) return false;

    const pendingDisc = await this.discrepanciesRepo.count({
      where: { sessionId, resolution: 'PENDING' },
    });
    if (pendingDisc > 0) return false;

    const receivedLines = await this.receivedLinesRepo.find({
      where: { sessionId },
    });
    const skus = [...new Set(receivedLines.map((l) => l.sku))];
    if (skus.length === 0) return false;

    const qcResults = await this.qcResultsRepo.find({ where: { sessionId } });
    const qcSkus = new Set(qcResults.map((q) => q.sku));
    return skus.every((sku) => qcSkus.has(sku));
  }

  async generatePutawayTasks(sessionId: string) {
    const session = await this.sessionsRepo.findOne({ where: { id: sessionId } });
    if (!session) throw new NotFoundException(`Session ${sessionId} not found`);

    const existing = await this.putawayTasksRepo.count({ where: { sessionId } });
    if (existing > 0) {
      return { ok: true as const, message: 'Tasks already generated' };
    }

    const receivedLines = await this.receivedLinesRepo.find({
      where: { sessionId },
    });
    if (receivedLines.length === 0) {
      return { ok: false as const, message: 'No received lines' };
    }

    const quarantineBySku = new Map<string, boolean>();
    for (const line of receivedLines) {
      if (line.quarantine) quarantineBySku.set(line.sku, true);
      else if (!quarantineBySku.has(line.sku)) quarantineBySku.set(line.sku, false);
    }

    type TaskDraft = {
      handlingUnitType: 'SSCC' | 'CONTAINER';
      handlingUnitCode: string;
      quarantine: boolean;
      lines: Array<{ sku: string; qty: number }>;
    };
    const drafts: TaskDraft[] = [];

    if (session.mode === 'SSCC') {
      const ssccs = await this.sessionSsccsRepo.find({ where: { sessionId } });
      for (const row of ssccs) {
        const pallet = await this.asnPalletsRepo.findOne({
          where: { sscc: row.sscc },
          relations: { items: true },
        });
        const items = pallet?.items ?? [];
        if (items.length === 0) continue;
        const lines = items.map((i) => ({ sku: i.sku, qty: i.qty }));
        const quarantine = lines.some((l) => quarantineBySku.get(l.sku));
        drafts.push({
          handlingUnitType: 'SSCC',
          handlingUnitCode: row.sscc,
          quarantine,
          lines,
        });
      }
    } else {
      const containers = await this.sessionContainersRepo.find({
        where: { sessionId },
      });
      const qtyBySku = new Map<string, number>();
      for (const line of receivedLines) {
        qtyBySku.set(line.sku, (qtyBySku.get(line.sku) ?? 0) + line.qty);
      }

      if (containers.length === 0) {
        for (const [sku, qty] of qtyBySku.entries()) {
          drafts.push({
            handlingUnitType: 'CONTAINER',
            handlingUnitCode: sku,
            quarantine: !!quarantineBySku.get(sku),
            lines: [{ sku, qty }],
          });
        }
      } else {
        const containersBySku = new Map<string, string[]>();
        for (const c of containers) {
          const sku = c.containerCode.split(':')[0];
          const list = containersBySku.get(sku) ?? [];
          list.push(c.containerCode);
          containersBySku.set(sku, list);
        }

        for (const [sku, codes] of containersBySku.entries()) {
          const totalQty = qtyBySku.get(sku) ?? 0;
          if (totalQty <= 0) continue;
          const base = Math.floor(totalQty / codes.length);
          let remainder = totalQty - base * codes.length;
          for (const code of codes) {
            const qty = base + (remainder > 0 ? 1 : 0);
            if (remainder > 0) remainder -= 1;
            if (qty <= 0) continue;
            drafts.push({
              handlingUnitType: 'CONTAINER',
              handlingUnitCode: code,
              quarantine: !!quarantineBySku.get(sku),
              lines: [{ sku, qty }],
            });
          }
        }
      }
    }

    if (drafts.length === 0) {
      return { ok: false as const, message: 'No handling units to putaway' };
    }

    await this.dataSource.transaction(async (manager) => {
      for (const draft of drafts) {
        const taskId = uid('PUT');
        await manager.save(
          PutawayTask,
          manager.create(PutawayTask, {
            id: taskId,
            sessionId,
            asnId: session.asnId,
            handlingUnitType: draft.handlingUnitType,
            handlingUnitCode: draft.handlingUnitCode,
            assignedLocation: null,
            status: 'PENDING',
            quarantine: draft.quarantine,
          }),
        );
        for (const line of draft.lines) {
          await manager.save(
            PutawayTaskLine,
            manager.create(PutawayTaskLine, {
              taskId,
              sku: line.sku,
              qty: line.qty,
              confirmedQty: null,
            }),
          );
        }
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

  async confirmPutaway(taskId: string, dto: ConfirmPutawayDto) {
    const task = await this.putawayTasksRepo.findOne({
      where: { id: taskId },
      relations: { lines: true },
    });
    if (!task) throw new NotFoundException(`Putaway task ${taskId} not found`);

    if (task.status === 'CONFIRMED') {
      return {
        ok: true as const,
        message: 'Already confirmed',
        assignedLocation: task.assignedLocation ?? undefined,
      };
    }

    const code = dto.code.trim();
    if (code !== task.handlingUnitCode) {
      throw new BadRequestException(
        `Scanned code ${code} does not match handling unit ${task.handlingUnitCode}`,
      );
    }

    let assignedLocation = '';

    await this.dataSource.transaction(async (manager) => {
      await manager.findOne(ReceivingSession, {
        where: { id: task.sessionId },
        lock: { mode: 'pessimistic_write' },
      });

      const current = await manager.findOne(PutawayTask, {
        where: { id: taskId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!current) {
        throw new NotFoundException(`Putaway task ${taskId} not found`);
      }
      if (current.status === 'CONFIRMED') {
        assignedLocation = current.assignedLocation ?? '';
        return;
      }

      const lines = await manager.find(PutawayTaskLine, {
        where: { taskId },
      });

      const location = await allocateLocation(manager, current.quarantine);
      assignedLocation = location.code;

      for (const line of lines) {
        await manager.update(
          PutawayTaskLine,
          { id: line.id },
          { confirmedQty: line.qty },
        );

        const existing = await manager.findOne(LocationInventory, {
          where: { locationCode: location.code, sku: line.sku },
        });
        if (existing) {
          await manager.increment(
            LocationInventory,
            { locationCode: location.code, sku: line.sku },
            'qty',
            line.qty,
          );
        } else {
          await manager.save(
            LocationInventory,
            manager.create(LocationInventory, {
              locationCode: location.code,
              sku: line.sku,
              qty: line.qty,
            }),
          );
        }

        if (!current.quarantine) {
          const inv = await manager.findOne(Inventory, {
            where: { sku: line.sku },
          });
          if (!inv) {
            await manager.save(
              Inventory,
              manager.create(Inventory, {
                sku: line.sku,
                available: line.qty,
                quarantine: 0,
              }),
            );
          } else {
            await manager.increment(
              Inventory,
              { sku: line.sku },
              'available',
              line.qty,
            );
          }
        }
      }

      await manager.update(
        PutawayTask,
        { id: taskId },
        {
          status: 'CONFIRMED',
          assignedLocation: location.code,
          confirmedAt: new Date(),
        },
      );

      await this.completeReceivingSessionIfReady(manager, current.sessionId);
    });

    return {
      ok: true as const,
      assignedLocation,
      message: `Conveyor dispatched to ${assignedLocation}`,
    };
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

  private toTaskDto(task: PutawayTask) {
    return {
      id: task.id,
      sessionId: task.sessionId,
      asnId: task.asnId,
      handlingUnitType: task.handlingUnitType as 'SSCC' | 'CONTAINER',
      handlingUnitCode: task.handlingUnitCode,
      assignedLocation: task.assignedLocation ?? undefined,
      status: task.status as 'PENDING' | 'CONFIRMED',
      quarantine: task.quarantine,
      confirmedAt: task.confirmedAt?.toISOString(),
      lines: (task.lines ?? []).map((l) => ({
        id: l.id,
        sku: l.sku,
        qty: l.qty,
        confirmedQty: l.confirmedQty ?? undefined,
      })),
    };
  }
}
