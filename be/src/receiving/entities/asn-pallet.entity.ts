import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryColumn,
} from 'typeorm';
import { Asn } from './asn.entity';
import { PalletItem } from './pallet-item.entity';

@Entity({ name: 'asn_pallets' })
export class AsnPallet {
  @PrimaryColumn({ type: 'varchar', length: 50 })
  sscc!: string;

  @Column({ name: 'asn_id', type: 'varchar', length: 50 })
  asnId!: string;

  @ManyToOne(() => Asn, (asn) => asn.pallets, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'asn_id' })
  asn!: Asn;

  @Column({ name: 'destination_wh', type: 'varchar', length: 50 })
  destinationWh!: string;

  @Column({ type: 'boolean', default: false })
  blocked!: boolean;

  @Column({ type: 'boolean', default: false })
  damaged!: boolean;

  @Column({ type: 'boolean', default: false })
  received!: boolean;

  @OneToMany(() => PalletItem, (item) => item.pallet, { cascade: true })
  items!: PalletItem[];
}
