import { Entity, PrimaryColumn } from 'typeorm';

@Entity({ name: 'session_ssccs' })
export class SessionSscc {
  @PrimaryColumn({ name: 'session_id', type: 'varchar', length: 50 })
  sessionId!: string;

  @PrimaryColumn({ type: 'varchar', length: 50 })
  sscc!: string;
}
