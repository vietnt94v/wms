import { Column, CreateDateColumn, Entity, PrimaryColumn } from 'typeorm';

@Entity({ name: 'qc_results' })
export class QcResult {
  @PrimaryColumn({ type: 'varchar', length: 50 })
  id!: string;

  @Column({ name: 'session_id', type: 'varchar', length: 50 })
  sessionId!: string;

  @Column({ type: 'varchar', length: 100 })
  sku!: string;

  @Column({ name: 'sample_qty', type: 'int' })
  sampleQty!: number;

  @Column({ type: 'boolean' })
  pass!: boolean;

  @Column({ type: 'text', nullable: true })
  reason!: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
}
