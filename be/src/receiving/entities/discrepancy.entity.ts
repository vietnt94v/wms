import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryColumn,
} from 'typeorm';

@Entity({ name: 'discrepancies' })
export class Discrepancy {
  @PrimaryColumn({ type: 'varchar', length: 50 })
  id!: string;

  @Column({ name: 'session_id', type: 'varchar', length: 50 })
  sessionId!: string;

  @Column({ name: 'asn_id', type: 'varchar', length: 50 })
  asnId!: string;

  @Column({ type: 'varchar', length: 30 })
  type!: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  sku!: string | null;

  @Column({ type: 'int', default: 0 })
  qty!: number;

  @Column({ type: 'text', nullable: true })
  note!: string | null;

  @Column({ type: 'varchar', length: 30, default: 'PENDING' })
  resolution!: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
}
