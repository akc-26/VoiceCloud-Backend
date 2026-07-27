import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from 'typeorm';

export enum AgencyRole {
  OWNER = 'OWNER',
  MANAGER = 'MANAGER',
  HOST = 'HOST',
  MEMBER = 'MEMBER',
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

  @CreateDateColumn()
  joinedAt: Date;
}
