import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';
import { ScanEvent } from './scan-event.entity';
import { SessionReceivedLine } from './session-received-line.entity';

@Entity({ name: 'receiving_sessions' })
export class ReceivingSession {
  @PrimaryColumn({ type: 'varchar', length: 50 })
  id!: string;

  @Column({ name: 'asn_id', type: 'varchar', length: 50 })
  asnId!: string;

  @Column({ name: 'dock_id', type: 'varchar', length: 50 })
  dockId!: string;

  @Column({ type: 'varchar', length: 20 })
  mode!: string;

  @Column({ type: 'varchar', length: 30 })
  status!: string;

  @Column({
    name: 'plate_no_entered',
    type: 'varchar',
    length: 50,
    nullable: true,
  })
  plateNoEntered!: string | null;

  @Column({ name: 'unknown_arrival', type: 'boolean', default: false })
  unknownArrival!: boolean;

  @Column({ name: 'supervisor_approved', type: 'boolean', default: false })
  supervisorApproved!: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;

  @OneToMany(() => SessionReceivedLine, (line) => line.session, {
    cascade: true,
  })
  receivedLines!: SessionReceivedLine[];

  @OneToMany(() => ScanEvent, (event) => event.session, { cascade: true })
  scanEvents!: ScanEvent[];
}
