import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { AsnPallet } from './asn-pallet.entity';

@Entity({ name: 'pallet_items' })
export class PalletItem {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 50 })
  sscc!: string;

  @ManyToOne(() => AsnPallet, (pallet) => pallet.items, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'sscc' })
  pallet!: AsnPallet;

  @Column({ type: 'varchar', length: 100 })
  sku!: string;

  @Column({ type: 'int' })
  qty!: number;

  @Column({ type: 'varchar', length: 100, nullable: true })
  lot!: string | null;

  @Column({ type: 'date', nullable: true })
  expiry!: string | null;
}
