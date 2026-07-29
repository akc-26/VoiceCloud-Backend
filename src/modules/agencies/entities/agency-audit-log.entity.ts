import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from 'typeorm';

@Entity('agency_audit_logs')
export class AgencyAuditLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar' })
  agencyId: string;

  @Column({ type: 'varchar' })
  action: string;

  @Column({ type: 'varchar' })
  performedBy: string;

  @Column({ type: 'text', nullable: true })
  details: string; // JSON string

  @Column({ type: 'varchar', nullable: true })
  ipAddress: string;

  @CreateDateColumn()
  createdAt: Date;
}
