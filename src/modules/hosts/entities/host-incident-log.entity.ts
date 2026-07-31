import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from 'typeorm';

@Entity('host_incident_logs')
export class HostIncidentLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar' })
  hostProfileId: string;

  @Column({ type: 'varchar' })
  roomId: string;

  @Column({ type: 'varchar' })
  targetUserId: string;

  @Column({ type: 'varchar' }) // KICK | MUTE | TEMP_BAN | PERM_BAN | INVITE_SPEAKER | REMOVE_SPEAKER | ASSIGN_MODERATOR | TRANSFER_HOST
  action: string;

  @Column({ type: 'text', nullable: true })
  reason: string | null;

  @Column({ type: 'int', nullable: true })
  durationMinutes: number | null;

  @CreateDateColumn()
  createdAt: Date;
}
