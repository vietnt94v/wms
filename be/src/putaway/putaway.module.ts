import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
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
import { PutawayController } from './controllers/putaway.controller';
import { PUTAWAY_ENTITIES } from './entities';
import { PutawayService } from './putaway.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ...PUTAWAY_ENTITIES,
      ReceivingSession,
      SessionReceivedLine,
      SessionSscc,
      SessionContainer,
      AsnPallet,
      Asn,
      Discrepancy,
      QcResult,
      Inventory,
      Dock,
      Appointment,
    ]),
  ],
  controllers: [PutawayController],
  providers: [PutawayService],
  exports: [PutawayService],
})
export class PutawayModule {}
