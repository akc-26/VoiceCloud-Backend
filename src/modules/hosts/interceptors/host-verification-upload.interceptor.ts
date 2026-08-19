import {
  BadRequestException,
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
  Optional,
  PayloadTooLargeException,
  SetMetadata,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import { Observable } from 'rxjs';
import * as multer from 'multer';
import { PrivateDocumentCategory } from '../../storage/enums/private-document-category.enum';

export const HOST_VERIFICATION_UPLOAD_CATEGORY =
  'hostVerificationUploadCategory';

export const HostVerificationUploadCategory = (
  category: PrivateDocumentCategory,
) => SetMetadata(HOST_VERIFICATION_UPLOAD_CATEGORY, category);

const LIMIT_CONFIG: Record<
  PrivateDocumentCategory,
  { key: string; defaultValue: number }
> = {
  [PrivateDocumentCategory.GOVERNMENT_ID]: {
    key: 'storage.hostGovernmentIdMaxSize',
    defaultValue: 10 * 1024 * 1024,
  },
  [PrivateDocumentCategory.SELFIE]: {
    key: 'storage.hostSelfieMaxSize',
    defaultValue: 5 * 1024 * 1024,
  },
  [PrivateDocumentCategory.SUPPORTING_DOCUMENT]: {
    key: 'storage.hostSupportingDocumentMaxSize',
    defaultValue: 20 * 1024 * 1024,
  },
};

@Injectable()
export class HostVerificationUploadInterceptor implements NestInterceptor {
  constructor(
    @Optional() private readonly configService: ConfigService | undefined,
    private readonly reflector: Reflector,
  ) {}

  async intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Promise<Observable<unknown>> {
    const category = this.reflector.get<PrivateDocumentCategory>(
      HOST_VERIFICATION_UPLOAD_CATEGORY,
      context.getHandler(),
    );
    const limitConfig = category ? LIMIT_CONFIG[category] : undefined;
    if (!limitConfig) {
      throw new Error('Host verification upload category is not configured');
    }

    const configuredLimit =
      this.configService?.get<number>(
        limitConfig.key,
        limitConfig.defaultValue,
      ) ?? limitConfig.defaultValue;
    if (!Number.isSafeInteger(configuredLimit) || configuredLimit <= 0) {
      throw new Error(`Invalid upload limit configuration: ${limitConfig.key}`);
    }

    const http = context.switchToHttp();
    const upload = multer({
      storage: multer.memoryStorage(),
      limits: {
        fileSize: configuredLimit,
        files: 1,
        fields: 0,
        parts: 2,
      },
    }).single('file');

    await new Promise<void>((resolve, reject) => {
      upload(http.getRequest(), http.getResponse(), (error) => {
        if (!error) {
          resolve();
          return;
        }
        if (error instanceof multer.MulterError) {
          if (error.code === 'LIMIT_FILE_SIZE') {
            reject(
              new PayloadTooLargeException(
                `File exceeds the configured ${category} size limit`,
              ),
            );
            return;
          }
          reject(
            new BadRequestException(`Invalid multipart upload: ${error.code}`),
          );
          return;
        }
        reject(new BadRequestException('Invalid multipart upload'));
      });
    });

    return next.handle();
  }
}
