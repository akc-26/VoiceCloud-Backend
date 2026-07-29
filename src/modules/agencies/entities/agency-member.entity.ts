import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from 'typeorm';

export enum AgencyRole {
  OWNER = 'OWNER',
  MANAGER = 'MANAGER',
  RECRUITER = 'RECRUITER',
  HOST = 'HOST',
  MEMBER = 'MEMBER',
}

export enum AgencyMemberStatus {
  ACTIVE = 'ACTIVE',
  SUSPENDED = 'SUSPENDED',
}

@Entity('agency_members')
export class AgencyMember {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar' })
  agencyId: string;

  @Column({ type: 'varchar' })
  userId: string;

  @Column({ type: 'varchar', default: AgencyRole.MEMBER })
  role: AgencyRole;

  @Column({ type: 'varchar', default: AgencyMemberStatus.ACTIVE })
  status: AgencyMemberStatus;

  @CreateDateColumn()
  joinedAt: Date;
}
