import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { AgencyRole } from './agency-member.entity';

export enum InvitationStatus {
  PENDING = 'PENDING',
  ACCEPTED = 'ACCEPTED',
  REJECTED = 'REJECTED',
  EXPIRED = 'EXPIRED',
}

@Entity('agency_invitations')
export class AgencyInvitation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar' })
  agencyId: string;

  @Column({ type: 'varchar' })
  inviterId: string;

  @Column({ type: 'varchar' })
  inviteeId: string;

  @Column({ type: 'varchar', default: AgencyRole.MEMBER })
  role: AgencyRole;

  @Column({ type: 'varchar', default: InvitationStatus.PENDING })
  status: InvitationStatus;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
