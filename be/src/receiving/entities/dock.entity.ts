import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity({ name: 'docks' })
export class Dock {
  @PrimaryColumn({ type: 'varchar', length: 50 })
  id!: string;

  @Column({ type: 'varchar', length: 100 })
  name!: string;

  @Column({ type: 'varchar', length: 20, default: 'AVAILABLE' })
  status!: string;
}
