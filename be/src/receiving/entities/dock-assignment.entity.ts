import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity({ name: 'dock_assignments' })
export class DockAssignment {
  @PrimaryColumn({ type: 'varchar', length: 50 })
  id!: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId!: string;

  @Column({ name: 'dock_id', type: 'varchar', length: 50 })
  dockId!: string;

  @Column({ type: 'varchar', length: 20, default: 'ACTIVE' })
  status!: string;

  @Column({ name: 'started_at', type: 'timestamptz' })
  startedAt!: Date;

  @Column({ name: 'ended_at', type: 'timestamptz', nullable: true })
  endedAt!: Date | null;
}
