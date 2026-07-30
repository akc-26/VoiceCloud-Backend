import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  CmsPage,
  CmsPageStatus,
  CmsPageVisibility,
} from './entities/cms-page.entity';
import { CreateCmsPageDto, UpdateCmsPageDto } from './dto/cms-page.dto';
import { RedisService } from '../../redis/redis.service';
import { AdminAuditLogsService } from './admin-audit-logs.service';

const CMS_PAGES_CACHE = 'cache:cms:pages:public';

const DEFAULT_CMS_PAGES = [
  {
    title: 'Privacy Policy',
    slug: 'privacy-policy',
    contentHtml:
      '<h1>Privacy Policy</h1><p>Welcome to VoiceCloud. We are committed to protecting your personal information and your right to privacy.</p>',
    seoTitle: 'Privacy Policy - VoiceCloud',
    seoDescription: 'VoiceCloud Privacy Policy and Data Practices',
  },
  {
    title: 'Terms & Conditions',
    slug: 'terms-and-conditions',
    contentHtml:
      '<h1>Terms and Conditions</h1><p>These Terms of Service govern your access to and use of VoiceCloud audio platforms and services.</p>',
    seoTitle: 'Terms & Conditions - VoiceCloud',
    seoDescription: 'VoiceCloud Platform Terms of Service',
  },
  {
    title: 'Refund Policy',
    slug: 'refund-policy',
    contentHtml:
      '<h1>Refund Policy</h1><p>Information regarding virtual currency recharge refunds, subscription cancellations, and billing inquiries.</p>',
    seoTitle: 'Refund Policy - VoiceCloud',
    seoDescription: 'VoiceCloud Billing & Refund Policy',
  },
  {
    title: 'Cancellation Policy',
    slug: 'cancellation-policy',
    contentHtml:
      '<h1>Cancellation Policy</h1><p>Details on cancelling subscriptions, memberships, and automated recurring charges.</p>',
    seoTitle: 'Cancellation Policy - VoiceCloud',
    seoDescription: 'Subscription and Order Cancellation Rules',
  },
  {
    title: 'Community Guidelines',
    slug: 'community-guidelines',
    contentHtml:
      '<h1>Community Guidelines</h1><p>Our expectations for respectful conduct in voice rooms, chat channels, and user interactions.</p>',
    seoTitle: 'Community Guidelines - VoiceCloud',
    seoDescription: 'VoiceCloud Safety and Community Rules',
  },
  {
    title: 'Safety Policy',
    slug: 'safety-policy',
    contentHtml:
      '<h1>Safety & Moderation Policy</h1><p>How we protect our users from harassment, abusive content, and illegal activities.</p>',
    seoTitle: 'Safety Policy - VoiceCloud',
    seoDescription: 'VoiceCloud User Safety and Content Moderation Guidelines',
  },
  {
    title: 'About Us',
    slug: 'about-us',
    contentHtml:
      '<h1>About VoiceCloud</h1><p>VoiceCloud is a next-generation real-time voice streaming and social interactive platform.</p>',
    seoTitle: 'About Us - VoiceCloud',
    seoDescription: 'Learn about the story and vision behind VoiceCloud',
  },
  {
    title: 'Help Center',
    slug: 'help-center',
    contentHtml:
      '<h1>Help Center</h1><p>Find answers to common questions about voice rooms, gifts, wallet recharges, and host verification.</p>',
    seoTitle: 'Help Center - VoiceCloud',
    seoDescription: 'VoiceCloud Help and Support Portal',
  },
  {
    title: 'FAQ',
    slug: 'faq',
    contentHtml:
      '<h1>Frequently Asked Questions</h1><p>Frequently asked questions regarding account setup, room hosting, agency onboarding, and VIP perks.</p>',
    seoTitle: 'FAQ - VoiceCloud',
    seoDescription: 'Frequently Asked Questions about VoiceCloud',
  },
  {
    title: 'Contact Us',
    slug: 'contact-us',
    contentHtml:
      '<h1>Contact Support</h1><p>Reach out to our customer care and moderation team via email or support ticket.</p>',
    seoTitle: 'Contact Us - VoiceCloud',
    seoDescription: 'Contact VoiceCloud Support Team',
  },
  {
    title: 'Careers',
    slug: 'careers',
    contentHtml:
      '<h1>Careers at VoiceCloud</h1><p>Join our team building the future of real-time audio and social interactions.</p>',
    seoTitle: 'Careers - VoiceCloud',
    seoDescription: 'Career Opportunities at VoiceCloud',
  },
  {
    title: 'Support',
    slug: 'support',
    contentHtml:
      '<h1>Customer Support</h1><p>Submit inquiries, report technical issues, or request assistance with your VoiceCloud account.</p>',
    seoTitle: 'Support - VoiceCloud',
    seoDescription: 'VoiceCloud Account Support',
  },
  {
    title: 'Cookie Policy',
    slug: 'cookie-policy',
    contentHtml:
      '<h1>Cookie Policy</h1><p>Information on how we use cookies and local identifiers for authentication and analytics.</p>',
    seoTitle: 'Cookie Policy - VoiceCloud',
    seoDescription: 'VoiceCloud Cookie and Tracking Policy',
  },
  {
    title: 'Data Deletion',
    slug: 'data-deletion',
    contentHtml:
      '<h1>Data Deletion Instructions</h1><p>How to request full deletion of your user data, message logs, and account records.</p>',
    seoTitle: 'Data Deletion - VoiceCloud',
    seoDescription: 'User Data Deletion Request Process',
  },
  {
    title: 'Account Deletion',
    slug: 'account-deletion',
    contentHtml:
      '<h1>Account Deletion Policy</h1><p>Steps to permanently delete your VoiceCloud user account and associated wallet balance.</p>',
    seoTitle: 'Account Deletion - VoiceCloud',
    seoDescription: 'VoiceCloud Permanent Account Deletion Guide',
  },
];

@Injectable()
export class AdminCmsService implements OnModuleInit {
  private readonly logger = new Logger(AdminCmsService.name);

  constructor(
    @InjectRepository(CmsPage)
    private readonly cmsRepo: Repository<CmsPage>,
    private readonly redisService: RedisService,
    private readonly auditLogsService: AdminAuditLogsService,
  ) {}

  async onModuleInit() {
    await this.seedDefaultPages();
  }

  private async seedDefaultPages() {
    for (const item of DEFAULT_CMS_PAGES) {
      const existing = await this.cmsRepo.findOne({
        where: { slug: item.slug },
      });
      if (existing) {
        let updated = false;
        if (
          existing.title !== item.title ||
          existing.seoTitle !== item.seoTitle ||
          existing.seoDescription !== item.seoDescription
        ) {
          existing.title = item.title;
          existing.seoTitle = item.seoTitle;
          existing.seoDescription = item.seoDescription;
          updated = true;
        }
        if (updated) {
          await this.cmsRepo.save(existing);
        }
      } else {
        const page = this.cmsRepo.create({
          ...item,
          status: CmsPageStatus.PUBLISHED,
          visibility: CmsPageVisibility.PUBLIC,
          publishedAt: new Date(),
          version: 1,
        });
        await this.cmsRepo.save(page);
        this.logger.log(`[Seed] Created CMS page: ${item.slug}`);
      }
    }
  }

  async findAllPublic(): Promise<CmsPage[]> {
    const cached = await this.redisService.get(CMS_PAGES_CACHE);
    if (cached) {
      try {
        return JSON.parse(cached) as CmsPage[];
      } catch {
        // Fallthrough
      }
    }

    const pages = await this.cmsRepo.find({
      where: {
        status: CmsPageStatus.PUBLISHED,
        visibility: CmsPageVisibility.PUBLIC,
      },
      select: {
        id: true,
        title: true,
        slug: true,
        seoTitle: true,
        seoDescription: true,
        updatedAt: true,
      },
      order: { title: 'ASC' },
    });

    await this.redisService.set(CMS_PAGES_CACHE, JSON.stringify(pages), 3600);
    return pages;
  }

  async findBySlug(slug: string): Promise<CmsPage | null> {
    const cacheKey = `cache:cms:page:${slug}`;
    const cached = await this.redisService.get(cacheKey);
    if (cached) {
      try {
        return JSON.parse(cached) as CmsPage;
      } catch {
        // Fallthrough
      }
    }

    const page = await this.cmsRepo.findOne({
      where: {
        slug,
        status: CmsPageStatus.PUBLISHED,
        visibility: CmsPageVisibility.PUBLIC,
      },
    });

    if (page) {
      await this.redisService.set(cacheKey, JSON.stringify(page), 3600);
    }
    return page;
  }

  async findAllAdmin(): Promise<CmsPage[]> {
    return this.cmsRepo.find({ order: { title: 'ASC' } });
  }

  async findByIdAdmin(id: string): Promise<CmsPage | null> {
    return this.cmsRepo.findOne({ where: { id } });
  }

  async create(dto: CreateCmsPageDto, userId?: string): Promise<CmsPage> {
    const page = this.cmsRepo.create({
      ...dto,
      version: 1,
      publishedAt:
        dto.status === CmsPageStatus.PUBLISHED ? new Date() : undefined,
      updatedBy: userId,
    });
    const saved = await this.cmsRepo.save(page);

    await this.invalidateCache(saved.slug);

    await this.auditLogsService.log({
      userId,
      module: 'cms',
      action: 'create',
      newValue: saved,
    });

    return saved;
  }

  async update(
    id: string,
    dto: UpdateCmsPageDto,
    userId?: string,
  ): Promise<CmsPage> {
    const page = await this.cmsRepo.findOne({ where: { id } });
    if (!page) {
      throw new Error(`CMS page with id '${id}' not found`);
    }

    const previousValue = { ...page };
    Object.assign(page, dto);
    page.version = (page.version || 1) + 1;
    page.updatedBy = userId;
    if (dto.status === CmsPageStatus.PUBLISHED && !page.publishedAt) {
      page.publishedAt = new Date();
    }

    const updated = await this.cmsRepo.save(page);

    await this.invalidateCache(updated.slug);

    await this.auditLogsService.log({
      userId,
      module: 'cms',
      action: 'update',
      previousValue: previousValue,
      newValue: updated,
    });

    return updated;
  }

  async remove(id: string, userId?: string): Promise<void> {
    const page = await this.cmsRepo.findOne({ where: { id } });
    if (page) {
      await this.cmsRepo.remove(page);
      await this.invalidateCache(page.slug);

      await this.auditLogsService.log({
        userId,
        module: 'cms',
        action: 'delete',
        previousValue: page,
      });
    }
  }

  private async invalidateCache(slug: string) {
    await this.redisService.del(CMS_PAGES_CACHE);
    await this.redisService.del(`cache:cms:page:${slug}`);
  }
}
