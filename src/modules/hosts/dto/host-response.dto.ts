import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  HostVerificationStatus,
  HostProfile,
} from '../entities/host-profile.entity';
import { maskIdentityNumber } from '../../../common/utils/masking.util';
import { PrivateDocumentCategory } from '../../storage/enums/private-document-category.enum';
import {
  PrivateAssetValidationStatus,
  PrivateAssetVisibility,
} from '../../storage/enums/private-asset.enum';

export class PublicHostResponseDto {
  @ApiProperty({ description: 'Host Profile ID' })
  id: string;

  @ApiProperty({ description: 'User ID' })
  userId: string;

  @ApiProperty({ enum: HostVerificationStatus })
  status: HostVerificationStatus;

  @ApiProperty()
  hostLevel: number;

  @ApiProperty()
  realName: string;

  @ApiPropertyOptional()
  bio?: string;

  @ApiPropertyOptional()
  country?: string;

  @ApiProperty()
  xp: number;

  @ApiProperty()
  performanceScore: number;

  @ApiProperty()
  totalRoomsHosted: number;

  @ApiProperty({ description: 'Verification status badge flag' })
  verificationBadge: boolean;

  @ApiProperty({ description: 'Host registration/approval date' })
  hostSince: Date;

  @ApiPropertyOptional({ type: [String] })
  achievements?: string[];
}

export class OwnerHostResponseDto {
  @ApiProperty({ description: 'Host Profile ID' })
  id: string;

  @ApiProperty({ description: 'User ID' })
  userId: string;

  @ApiProperty({ enum: HostVerificationStatus })
  status: HostVerificationStatus;

  @ApiProperty()
  hostLevel: number;

  @ApiProperty()
  realName: string;

  @ApiPropertyOptional()
  bio?: string;

  @ApiPropertyOptional()
  country?: string;

  @ApiPropertyOptional({ type: [String] })
  languages?: string[];

  @ApiPropertyOptional({ type: [String] })
  categories?: string[];

  @ApiPropertyOptional()
  experience?: string;

  @ApiPropertyOptional({
    description: 'Masked government ID / passport number',
  })
  idNumber?: string;

  @ApiPropertyOptional({ description: 'Applicant-facing rejection reason' })
  rejectionReason?: string;

  @ApiProperty({ description: 'Whether government ID document was uploaded' })
  hasGovernmentIdUploaded: boolean;

  @ApiProperty({ description: 'Whether profile selfie photo was uploaded' })
  hasProfilePhotoUploaded: boolean;

  @ApiProperty({
    description: 'Whether additional verification documents were uploaded',
  })
  hasSupportingDocumentsUploaded: boolean;

  @ApiProperty()
  hostRating: number;

  @ApiProperty()
  totalRoomsHosted: number;

  @ApiProperty()
  peakListeners: number;

  @ApiProperty()
  xp: number;

  @ApiProperty()
  performanceScore: number;

  @ApiProperty()
  followersCount: number;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}

export class AdminHostResponseDto {
  @ApiProperty({ description: 'Host Profile ID' })
  id: string;

  @ApiProperty({ description: 'User ID' })
  userId: string;

  @ApiProperty({ enum: HostVerificationStatus })
  status: HostVerificationStatus;

  @ApiProperty()
  hostLevel: number;

  @ApiProperty()
  realName: string;

  @ApiPropertyOptional()
  bio?: string;

  @ApiPropertyOptional()
  country?: string;

  @ApiPropertyOptional({ type: [String] })
  languages?: string[];

  @ApiPropertyOptional({ type: [String] })
  categories?: string[];

  @ApiPropertyOptional()
  experience?: string;

  @ApiProperty()
  xp: number;

  @ApiProperty()
  performanceScore: number;

  @ApiProperty()
  hostRating: number;

  @ApiProperty()
  followersCount: number;

  @ApiProperty()
  totalRoomsHosted: number;

  @ApiProperty()
  totalSpeakingTimeMinutes: number;

  @ApiPropertyOptional({
    description: 'Masked identity number for review list',
  })
  idNumber?: string;

  @ApiPropertyOptional({
    description: 'Government ID Document URL for admin verification',
  })
  documentUrl?: string;

  @ApiPropertyOptional({
    description: 'Selfie Profile Photo URL for admin verification',
  })
  selfieUrl?: string;

  @ApiPropertyOptional({ description: 'Rejection reason' })
  rejectionReason?: string;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}

export class MapperUtils {
  static toPublicHostDto(host: HostProfile): PublicHostResponseDto {
    return {
      id: host.id,
      userId: host.userId,
      status: host.status,
      hostLevel: host.hostLevel || 1,
      realName: host.realName || '',
      bio: host.bio || '',
      country: host.country || '',
      xp: host.xp || 0,
      performanceScore: Number(host.performanceScore || 0),
      totalRoomsHosted: host.totalRoomsHosted || 0,
      verificationBadge: host.status === HostVerificationStatus.APPROVED,
      hostSince: host.createdAt,
      achievements: host.growthMilestones
        ? host.growthMilestones.split(',')
        : [],
    };
  }

  static toOwnerHostDto(host: HostProfile): OwnerHostResponseDto {
    const activePrivateAssets = (host.verificationAssets || []).filter(
      (asset) =>
        asset.visibility === PrivateAssetVisibility.PRIVATE &&
        asset.validationStatus === PrivateAssetValidationStatus.VALIDATED &&
        asset.isActive &&
        !asset.retiredAt &&
        !asset.replacedByAssetId,
    );

    return {
      id: host.id,
      userId: host.userId,
      status: host.status,
      hostLevel: host.hostLevel || 1,
      realName: host.realName || '',
      bio: host.bio || '',
      country: host.country || '',
      languages: host.languages || [],
      categories: host.categories || [],
      experience: host.experience || '',
      idNumber: maskIdentityNumber(host.idNumber),
      rejectionReason:
        host.status === HostVerificationStatus.REJECTED
          ? host.rejectionReason || undefined
          : undefined,
      hasGovernmentIdUploaded:
        !!host.documentUrl ||
        activePrivateAssets.some(
          (asset) => asset.category === PrivateDocumentCategory.GOVERNMENT_ID,
        ),
      hasProfilePhotoUploaded:
        !!host.selfieUrl ||
        activePrivateAssets.some(
          (asset) => asset.category === PrivateDocumentCategory.SELFIE,
        ),
      hasSupportingDocumentsUploaded:
        !!host.documentUrl ||
        activePrivateAssets.some(
          (asset) =>
            asset.category === PrivateDocumentCategory.SUPPORTING_DOCUMENT,
        ),
      hostRating: Number(host.hostRating || 0),
      totalRoomsHosted: host.totalRoomsHosted || 0,
      peakListeners: host.peakListeners || 0,
      xp: host.xp || 0,
      performanceScore: Number(host.performanceScore || 0),
      followersCount: host.followersCount || 0,
      createdAt: host.createdAt,
      updatedAt: host.updatedAt,
    };
  }

  static toAdminHostDto(
    host: HostProfile,
    maskId = true,
  ): AdminHostResponseDto {
    return {
      id: host.id,
      userId: host.userId,
      status: host.status,
      hostLevel: host.hostLevel || 1,
      realName: host.realName || '',
      bio: host.bio || '',
      country: host.country || '',
      languages: host.languages || [],
      categories: host.categories || [],
      experience: host.experience || '',
      xp: host.xp || 0,
      performanceScore: Number(host.performanceScore || 0),
      hostRating: Number(host.hostRating || 0),
      followersCount: host.followersCount || 0,
      totalRoomsHosted: host.totalRoomsHosted || 0,
      totalSpeakingTimeMinutes: host.totalSpeakingTimeMinutes || 0,
      idNumber: maskId ? maskIdentityNumber(host.idNumber) : host.idNumber,
      documentUrl: host.documentUrl || undefined,
      selfieUrl: host.selfieUrl || undefined,
      rejectionReason: host.rejectionReason || undefined,
      createdAt: host.createdAt,
      updatedAt: host.updatedAt,
    };
  }
}
