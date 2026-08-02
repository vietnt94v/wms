import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Asn } from './asn.entity';

@Entity({ name: 'asn_lines' })
export class AsnLine {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'asn_id', type: 'varchar', length: 50 })
  asnId!: string;

  @ManyToOne(() => Asn, (asn) => asn.lines, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'asn_id' })
  asn!: Asn;

  @Column({ type: 'varchar', length: 100 })
  sku!: string;

  @Column({ name: 'expected_qty', type: 'int' })
  expectedQty!: number;

  @Column({ name: 'received_qty', type: 'int', default: 0 })
  receivedQty!: number;
}
