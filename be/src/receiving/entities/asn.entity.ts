import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';
import { AsnLine } from './asn-line.entity';
import { AsnPallet } from './asn-pallet.entity';
import { Supplier } from './supplier.entity';

@Entity({ name: 'asns' })
export class Asn {
  @PrimaryColumn({ type: 'varchar', length: 50 })
  id!: string;

  @Column({ name: 'supplier_id', type: 'varchar', length: 50 })
  supplierId!: string;

  @ManyToOne(() => Supplier)
  @JoinColumn({ name: 'supplier_id' })
  supplier!: Supplier;

  @Column({ type: 'varchar', length: 20 })
  type!: string;

  @Column({ type: 'varchar', length: 100 })
  carrier!: string;

  @Column({ name: 'plate_no', type: 'varchar', length: 50 })
  plateNo!: string;

  @Column({ type: 'varchar', length: 30 })
  status!: string;

  @Column({ type: 'timestamptz', nullable: true })
  eta!: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;

  @OneToMany(() => AsnLine, (line) => line.asn, { cascade: true })
  lines!: AsnLine[];

  @OneToMany(() => AsnPallet, (pallet) => pallet.asn, { cascade: true })
  pallets!: AsnPallet[];
}
