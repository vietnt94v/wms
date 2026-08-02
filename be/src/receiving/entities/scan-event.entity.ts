import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryColumn,
} from 'typeorm';
import { ReceivingSession } from './receiving-session.entity';

@Entity({ name: 'scan_events' })
export class ScanEvent {
  @PrimaryColumn({ type: 'varchar', length: 50 })
  id!: string;

  @Column({ name: 'session_id', type: 'varchar', length: 50 })
  sessionId!: string;

  @ManyToOne(() => ReceivingSession, (session) => session.scanEvents, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'session_id' })
  session!: ReceivingSession;

  @Column({ type: 'varchar', length: 255 })
  code!: string;

  @Column({ type: 'varchar', length: 20 })
  kind!: string;

  @Column({ type: 'varchar', length: 10 })
  result!: string;

  @Column({ name: 'error_type', type: 'varchar', length: 50, nullable: true })
  errorType!: string | null;

  @Column({ type: 'text' })
  message!: string;

  @Column({ name: 'action_hint', type: 'text', nullable: true })
  actionHint!: string | null;

  @Column({ type: 'timestamptz' })
  ts!: Date;
}
