import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export enum CmsPageStatus {
  DRAFT = 'draft',
  PUBLISHED = 'published',
  ARCHIVED = 'archived',
}

export enum CmsPageVisibility {
  PUBLIC = 'public',
  PRIVATE = 'private',
}

@Entity('cms_pages')
export class CmsPage {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  title: string;

  @Index({ unique: true })
  @Column({ unique: true })
  slug: string;

  @Column({ type: 'text' })
  contentHtml: string;

  @Column({ nullable: true })
  seoTitle?: string;

  @Column({ nullable: true, type: 'text' })
  seoDescription?: string;

  @Column({ type: 'jsonb', nullable: true })
  keywords?: string[];

  @Column({
    type: 'enum',
    enum: CmsPageStatus,
    default: CmsPageStatus.PUBLISHED,
  })
  status: CmsPageStatus;

  @Column({ default: 1 })
  version: number;

  @Column({ nullable: true, type: 'timestamp' })
  publishedAt?: Date;

  @Column({ nullable: true })
  updatedBy?: string;

  @Column({
    type: 'enum',
    enum: CmsPageVisibility,
    default: CmsPageVisibility.PUBLIC,
  })
  visibility: CmsPageVisibility;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
