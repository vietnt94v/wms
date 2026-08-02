import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppointmentsController } from './controllers/appointments.controller';
import { AsnsController } from './controllers/asns.controller';
import { CatalogController } from './controllers/catalog.controller';
import { DiscrepanciesController } from './controllers/discrepancies.controller';
import { DocksController } from './controllers/docks.controller';
import { InboundController } from './controllers/inbound.controller';
import { InventoryController } from './controllers/inventory.controller';
import { PutawayController } from './controllers/putaway.controller';
import { QcController } from './controllers/qc.controller';
import { SessionsController } from './controllers/sessions.controller';
import { RECEIVING_ENTITIES } from './entities';
import { ReceivingService } from './receiving.service';

@Module({
  imports: [TypeOrmModule.forFeature(RECEIVING_ENTITIES)],
  controllers: [
    CatalogController,
    AsnsController,
    InboundController,
    DocksController,
    AppointmentsController,
    SessionsController,
    DiscrepanciesController,
    QcController,
    PutawayController,
    InventoryController,
  ],
  providers: [ReceivingService],
  exports: [ReceivingService],
})
export class ReceivingModule {}
