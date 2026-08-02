import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { ReceivingSession } from './receiving-session.entity';

@Entity({ name: 'session_received_lines' })
export class SessionReceivedLine {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'session_id', type: 'varchar', length: 50 })
  sessionId!: string;

  @ManyToOne(() => ReceivingSession, (session) => session.receivedLines, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'session_id' })
  session!: ReceivingSession;

  @Column({ type: 'varchar', length: 100 })
  sku!: string;

  @Column({ type: 'int' })
  qty!: number;

  @Column({ type: 'varchar', length: 100, nullable: true })
  lot!: string | null;

  @Column({ type: 'date', nullable: true })
  expiry!: string | null;

  @Column({ type: 'boolean', default: false })
  quarantine!: boolean;
}
