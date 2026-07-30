import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export enum SettingValueType {
  STRING = 'string',
  BOOLEAN = 'boolean',
  NUMBER = 'number',
  JSON = 'json',
}

@Entity('system_settings')
export class SystemSetting {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index({ unique: true })
  @Column({ unique: true })
  key: string;

  @Index()
  @Column()
  group: string;

  @Column()
  title: string;

  @Column({ nullable: true, type: 'text' })
  description?: string;

  @Column({ type: 'text' })
  value: string;

  @Column({
    type: 'enum',
    enum: SettingValueType,
    default: SettingValueType.STRING,
  })
  valueType: SettingValueType;

  @Column({ nullable: true, type: 'text' })
  defaultValue?: string;

  @Column({ type: 'jsonb', nullable: true })
  validationRules?: Record<string, any>;

  @Column({ default: true })
  isEditable: boolean;

  @Column({ default: false })
  isPublic: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
