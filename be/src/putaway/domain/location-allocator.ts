import { BadRequestException } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { Location } from '../entities/location.entity';

export async function allocateLocation(
  manager: EntityManager,
  quarantine: boolean,
): Promise<Location> {
  const zone = quarantine ? 'QUARANTINE' : 'STORAGE';

  const location = await manager
    .createQueryBuilder(Location, 'loc')
    .setLock('pessimistic_write')
    .where('loc.zone = :zone', { zone })
    .andWhere('loc.status = :status', { status: 'AVAILABLE' })
    .orderBy('loc.rowLabel', 'ASC')
    .addOrderBy('loc.colNum', 'ASC')
    .getOne();

  if (!location) {
    throw new BadRequestException(`No available ${zone.toLowerCase()} location`);
  }

  await manager.update(Location, { code: location.code }, { status: 'OCCUPIED' });
  location.status = 'OCCUPIED';
  return location;
}
