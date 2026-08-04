import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity({ name: 'location_inventory' })
export class LocationInventory {
  @PrimaryColumn({ name: 'location_code', type: 'varchar', length: 20 })
  locationCode!: string;

  @PrimaryColumn({ type: 'varchar', length: 100 })
  sku!: string;

  @Column({ type: 'int', default: 0 })
  qty!: number;
}
