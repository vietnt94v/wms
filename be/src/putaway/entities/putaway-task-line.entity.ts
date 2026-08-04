import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { PutawayTask } from './putaway-task.entity';

@Entity({ name: 'putaway_task_lines' })
export class PutawayTaskLine {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'task_id', type: 'varchar', length: 50 })
  taskId!: string;

  @ManyToOne(() => PutawayTask, (task) => task.lines, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'task_id' })
  task!: PutawayTask;

  @Column({ type: 'varchar', length: 100 })
  sku!: string;

  @Column({ type: 'int' })
  qty!: number;

  @Column({ name: 'confirmed_qty', type: 'int', nullable: true })
  confirmedQty!: number | null;
}
