import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { MediaCategory } from '../enums/media-category.enum';

@Entity('media_files')
export class MediaFile {
  @ApiProperty({ example: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11' })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({ example: 'avatar.png' })
  @Column({ type: 'varchar' })
  filename: string;

  @ApiProperty({ example: 'f83a910d-2b41-4c12-8f19-918239abc112.png' })
  @Column({ type: 'varchar' })
  storedName: string;

  @ApiProperty({
    example: 'uploads/avatar/f83a910d-2b41-4c12-8f19-918239abc112.png',
  })
  @Column({ type: 'varchar' })
  filePath: string;

  @ApiProperty({
    example: '/uploads/avatar/f83a910d-2b41-4c12-8f19-918239abc112.png',
  })
  @Column({ type: 'varchar' })
  publicUrl: string;

  @ApiProperty({
    example: '/uploads/avatar/f83a910d-2b41-4c12-8f19-918239abc112.png',
  })
  @Column({ type: 'varchar' })
  internalUrl: string;

  @ApiProperty({ example: 'image/png' })
  @Column({ type: 'varchar' })
  mimeType: string;

  @ApiProperty({ example: 1048576 })
  @Column({ type: 'bigint' })
  size: number;

  @ApiProperty({ enum: MediaCategory, example: MediaCategory.AVATAR })
  @Column({ type: 'varchar' })
  @Index()
  category: MediaCategory;

  @ApiPropertyOptional({ example: 500, nullable: true })
  @Column({ type: 'int', nullable: true })
  width: number | null;

  @ApiPropertyOptional({ example: 500, nullable: true })
  @Column({ type: 'int', nullable: true })
  height: number | null;

  @ApiPropertyOptional({
    example: '11111111-1111-1111-1111-111111111111',
    nullable: true,
  })
  @Column({ type: 'varchar', nullable: true })
  @Index()
  uploadedById: string | null;

  @ApiPropertyOptional({ example: 'user', nullable: true })
  @Column({ type: 'varchar', nullable: true })
  @Index()
  entityType: string | null;

  @ApiPropertyOptional({
    example: '11111111-1111-1111-1111-111111111111',
    nullable: true,
  })
  @Column({ type: 'varchar', nullable: true })
  @Index()
  entityId: string | null;

  @ApiPropertyOptional({ nullable: true })
  @Column({ type: 'json', nullable: true })
  metadata: Record<string, unknown> | null;

  @ApiProperty()
  @CreateDateColumn()
  createdAt: Date;

  @ApiProperty()
  @UpdateDateColumn()
  updatedAt: Date;
}
