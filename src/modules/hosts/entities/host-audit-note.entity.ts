import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from 'typeorm';

@Entity('host_audit_notes')
export class HostAuditNote {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar' })
  hostProfileId: string;

  @Column({ type: 'varchar' })
  adminId: string;

  @Column({ type: 'text' })
  note: string;

  @Column({ type: 'varchar', default: 'NOTE_ADDED' })
  action: string;

  @CreateDateColumn()
  createdAt: Date;
}
