import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryColumn,
} from 'typeorm';

@Entity({ name: 'appointments' })
export class Appointment {
  @PrimaryColumn({ type: 'varchar', length: 50 })
  id!: string;

  @Column({ name: 'asn_id', type: 'varchar', length: 50 })
  asnId!: string;

  @Column({ name: 'dock_id', type: 'varchar', length: 50 })
  dockId!: string;

  @Column({ name: 'window_start', type: 'timestamptz' })
  windowStart!: Date;

  @Column({ name: 'window_end', type: 'timestamptz' })
  windowEnd!: Date;

  @Column({ type: 'varchar', length: 20, default: 'BOOKED' })
  status!: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
}
