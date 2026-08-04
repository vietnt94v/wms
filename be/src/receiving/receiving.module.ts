import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PutawayModule } from '../putaway/putaway.module';
import { UsersModule } from '../users/users.module';
import { AppointmentsController } from './controllers/appointments.controller';
import { AsnsController } from './controllers/asns.controller';
import { CatalogController } from './controllers/catalog.controller';
import { DiscrepanciesController } from './controllers/discrepancies.controller';
import { DocksController } from './controllers/docks.controller';
import { InboundController } from './controllers/inbound.controller';
import { InventoryController } from './controllers/inventory.controller';
import { QcController } from './controllers/qc.controller';
import { SessionsController } from './controllers/sessions.controller';
import { RECEIVING_ENTITIES } from './entities';
import { ReceivingService } from './receiving.service';

@Module({
  imports: [
    TypeOrmModule.forFeature(RECEIVING_ENTITIES),
    UsersModule,
    PutawayModule,
  ],
  controllers: [
    CatalogController,
    AsnsController,
    InboundController,
    DocksController,
    AppointmentsController,
    SessionsController,
    DiscrepanciesController,
    QcController,
    InventoryController,
  ],
  providers: [ReceivingService],
  exports: [ReceivingService],
})
export class ReceivingModule {}
