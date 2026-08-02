import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity({ name: 'inventory' })
export class Inventory {
  @PrimaryColumn({ type: 'varchar', length: 100 })
  sku!: string;

  @Column({ type: 'int', default: 0 })
  available!: number;

  @Column({ type: 'int', default: 0 })
  quarantine!: number;
}
