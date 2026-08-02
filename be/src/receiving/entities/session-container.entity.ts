import { Entity, PrimaryColumn } from 'typeorm';

@Entity({ name: 'session_containers' })
export class SessionContainer {
  @PrimaryColumn({ name: 'session_id', type: 'varchar', length: 50 })
  sessionId!: string;

  @PrimaryColumn({ name: 'container_code', type: 'varchar', length: 255 })
  containerCode!: string;
}
