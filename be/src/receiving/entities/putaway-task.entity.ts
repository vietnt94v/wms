import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryColumn,
} from 'typeorm';

@Entity({ name: 'putaway_tasks' })
export class PutawayTask {
  @PrimaryColumn({ type: 'varchar', length: 50 })
  id!: string;

  @Column({ name: 'session_id', type: 'varchar', length: 50 })
  sessionId!: string;

  @Column({ name: 'asn_id', type: 'varchar', length: 50 })
  asnId!: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  sscc!: string | null;

  @Column({ type: 'varchar', length: 100 })
  sku!: string;

  @Column({ type: 'int' })
  qty!: number;

  @Column({ name: 'suggested_location', type: 'varchar', length: 50 })
  suggestedLocation!: string;

  @Column({ type: 'varchar', length: 20, default: 'PENDING' })
  status!: string;

  @Column({ type: 'boolean', default: false })
  quarantine!: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
}
