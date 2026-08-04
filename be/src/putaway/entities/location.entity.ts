import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity({ name: 'locations' })
export class Location {
  @PrimaryColumn({ type: 'varchar', length: 20 })
  code!: string;

  @Column({ name: 'warehouse_id', type: 'varchar', length: 50, default: 'WH-01' })
  warehouseId!: string;

  @Column({ type: 'varchar', length: 20 })
  zone!: string;

  @Column({ name: 'row_label', type: 'varchar', length: 5 })
  rowLabel!: string;

  @Column({ name: 'col_num', type: 'int' })
  colNum!: number;

  @Column({ type: 'varchar', length: 20, default: 'AVAILABLE' })
  status!: string;
}
