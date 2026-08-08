import { BadRequestException, PayloadTooLargeException } from '@nestjs/common';
import * as path from 'path';
import { PrivateDocumentCategory } from '../../storage/enums/private-document-category.enum';

export interface ValidatedHostVerificationFile {
  originalFilename: string;
  extension: string;
  verifiedMimeType: string;
  verifiedFormat: string;
  fileSize: number;
}

interface FormatRule {
  format: string;
  mimeType: string;
  extensions: string[];
  matches: (buffer: Buffer) => boolean;
}

const FORMAT_RULES: FormatRule[] = [
  {
    format: 'JPEG',
    mimeType: 'image/jpeg',
    extensions: ['.jpg', '.jpeg'],
    matches: (buffer) =>
      buffer.length >= 3 &&
      buffer[0] === 0xff &&
      buffer[1] === 0xd8 &&
      buffer[2] === 0xff,
  },
  {
    format: 'PNG',
    mimeType: 'image/png',
    extensions: ['.png'],
    matches: (buffer) =>
      buffer.length >= 8 &&
      buffer
        .subarray(0, 8)
        .equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])),
  },
  {
    format: 'WEBP',
    mimeType: 'image/webp',
    extensions: ['.webp'],
    matches: (buffer) =>
      buffer.length >= 12 &&
      buffer.subarray(0, 4).toString('ascii') === 'RIFF' &&
      buffer.subarray(8, 12).toString('ascii') === 'WEBP',
  },
  {
    format: 'PDF',
    mimeType: 'application/pdf',
    extensions: ['.pdf'],
    matches: (buffer) =>
      buffer.length >= 5 && buffer.subarray(0, 5).toString('ascii') === '%PDF-',
  },
];

const CATEGORY_FORMATS: Record<PrivateDocumentCategory, string[]> = {
  [PrivateDocumentCategory.GOVERNMENT_ID]: ['JPEG', 'PNG', 'PDF'],
  [PrivateDocumentCategory.SELFIE]: ['JPEG', 'PNG', 'WEBP'],
  [PrivateDocumentCategory.SUPPORTING_DOCUMENT]: ['JPEG', 'PNG', 'PDF'],
};

export function sanitizePrivateDocumentFilename(filename: string): string {
  if (!filename || filename.includes('\0')) {
    throw new BadRequestException('A valid original filename is required');
  }

  const basename = filename.replace(/\\/g, '/').split('/').pop() ?? '';
  const normalized = Array.from(basename.normalize('NFKC'))
    .filter((character) => {
      const code = character.charCodeAt(0);
      return code > 31 && code !== 127;
    })
    .join('')
    .trim();
  const extension = path.extname(normalized).toLowerCase();
  const rawStem = normalized.slice(0, normalized.length - extension.length);
  const safeStem = rawStem
    .replace(/[^a-zA-Z0-9._ -]/g, '_')
    .replace(/\s+/g, ' ')
    .replace(/^[. ]+|[. ]+$/g, '')
    .trim();
  const finalStem = safeStem || 'document';
  const maxStemLength = Math.max(1, 255 - extension.length);

  return `${finalStem.slice(0, maxStemLength)}${extension}`;
}

export function validateHostVerificationFile(
  file: Express.Multer.File,
  category: PrivateDocumentCategory,
  maxSize: number,
): ValidatedHostVerificationFile {
  if (!file || !Buffer.isBuffer(file.buffer)) {
    throw new BadRequestException('Verification file is required');
  }
  if (!Number.isSafeInteger(maxSize) || maxSize <= 0) {
    throw new Error('Invalid Host verification upload size configuration');
  }

  const fileSize = file.buffer.length;
  if (fileSize === 0) {
    throw new BadRequestException('Verification file cannot be empty');
  }
  if (fileSize > maxSize) {
    throw new PayloadTooLargeException(
      `File exceeds the configured ${category} size limit`,
    );
  }

  const sanitizedFilename = sanitizePrivateDocumentFilename(file.originalname);
  const extension = path.extname(sanitizedFilename).toLowerCase();
  const declaredMimeType = (file.mimetype || '').trim().toLowerCase();
  const detectedRule = FORMAT_RULES.find((rule) => rule.matches(file.buffer));
  const allowedFormats = CATEGORY_FORMATS[category];

  if (!allowedFormats || !detectedRule) {
    throw new BadRequestException(
      'File content is not an allowed Host verification format',
    );
  }
  if (!allowedFormats.includes(detectedRule.format)) {
    throw new BadRequestException(
      `${detectedRule.format} is not allowed for ${category}`,
    );
  }
  if (!detectedRule.extensions.includes(extension)) {
    throw new BadRequestException(
      'Filename extension does not match the verified file content',
    );
  }
  if (declaredMimeType !== detectedRule.mimeType) {
    throw new BadRequestException(
      'Declared MIME type does not match the verified file content',
    );
  }

  return {
    originalFilename: sanitizedFilename,
    extension,
    verifiedMimeType: detectedRule.mimeType,
    verifiedFormat: detectedRule.format,
    fileSize,
  };
}
