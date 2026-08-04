import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryColumn,
} from 'typeorm';
import { PutawayTaskLine } from './putaway-task-line.entity';

@Entity({ name: 'putaway_tasks' })
export class PutawayTask {
  @PrimaryColumn({ type: 'varchar', length: 50 })
  id!: string;

  @Column({ name: 'session_id', type: 'varchar', length: 50 })
  sessionId!: string;

  @Column({ name: 'asn_id', type: 'varchar', length: 50 })
  asnId!: string;

  @Column({ name: 'handling_unit_type', type: 'varchar', length: 20 })
  handlingUnitType!: string;

  @Column({ name: 'handling_unit_code', type: 'varchar', length: 255 })
  handlingUnitCode!: string;

  @Column({ name: 'assigned_location', type: 'varchar', length: 20, nullable: true })
  assignedLocation!: string | null;

  @Column({ type: 'varchar', length: 20, default: 'PENDING' })
  status!: string;

  @Column({ type: 'boolean', default: false })
  quarantine!: boolean;

  @Column({ name: 'confirmed_at', type: 'timestamptz', nullable: true })
  confirmedAt!: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @OneToMany(() => PutawayTaskLine, (line) => line.task, { cascade: true })
  lines!: PutawayTaskLine[];
}
