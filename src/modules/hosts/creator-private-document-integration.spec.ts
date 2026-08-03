import { readFileSync } from 'fs';
import { resolve } from 'path';
import {
  activeAssetsForCategory,
  formatPrivateAssetSize,
  preferredAssetForCategory,
  validateHostVerificationFileSelection,
} from '../../../creator/src/utils/host-verification-assets';
import {
  HostVerificationAsset,
  HostVerificationDocumentCategory,
} from '../../../creator/src/types/creator.types';

function assetFixture(
  assetId: string,
  category: HostVerificationDocumentCategory,
  overrides: Partial<HostVerificationAsset> = {},
): HostVerificationAsset {
  return {
    assetId,
    category,
    originalFilename: `${assetId}.pdf`,
    verifiedMimeType: 'application/pdf',
    verifiedFormat: 'PDF',
    fileSize: 1024,
    validationStatus: 'VALIDATED',
    isActive: true,
    linkedToApplication: false,
    createdAt: '2026-08-03T00:00:00.000Z',
    ...overrides,
  };
}

function selectedFile(size: number, type: string): File {
  return { size, type } as File;
}

function creatorSource(relativePath: string): string {
  return readFileSync(resolve(process.cwd(), 'creator', 'src', relativePath), {
    encoding: 'utf8',
  });
}

describe('Creator private Host document integration (B2B-1)', () => {
  describe('Safe asset selection', () => {
    it('prefers a current linked asset over a newer unlinked upload', () => {
      const linked = assetFixture('linked-id', 'GOVERNMENT_ID', {
        linkedToApplication: true,
        createdAt: '2026-08-01T00:00:00.000Z',
      });
      const newer = assetFixture('new-id', 'GOVERNMENT_ID', {
        createdAt: '2026-08-03T00:00:00.000Z',
      });

      expect(preferredAssetForCategory([newer, linked], 'GOVERNMENT_ID')).toBe(
        linked,
      );
    });

    it('uses the newest validated active upload when no asset is linked', () => {
      const older = assetFixture('older', 'SELFIE', {
        createdAt: '2026-08-01T00:00:00.000Z',
      });
      const newer = assetFixture('newer', 'SELFIE', {
        createdAt: '2026-08-03T00:00:00.000Z',
      });
      const pending = assetFixture('pending', 'SELFIE', {
        validationStatus: 'PENDING',
        createdAt: '2026-08-04T00:00:00.000Z',
      });

      expect(preferredAssetForCategory([older, pending, newer], 'SELFIE')).toBe(
        newer,
      );
    });

    it('retains multiple active supporting documents', () => {
      const first = assetFixture('first', 'SUPPORTING_DOCUMENT');
      const second = assetFixture('second', 'SUPPORTING_DOCUMENT');
      const inactive = assetFixture('inactive', 'SUPPORTING_DOCUMENT', {
        isActive: false,
      });

      expect(
        activeAssetsForCategory(
          [first, inactive, second],
          'SUPPORTING_DOCUMENT',
        ).map((asset) => asset.assetId),
      ).toEqual(expect.arrayContaining(['first', 'second']));
      expect(
        activeAssetsForCategory(
          [first, inactive, second],
          'SUPPORTING_DOCUMENT',
        ),
      ).toHaveLength(2);
    });

    it('applies category MIME and development-size guidance before upload', () => {
      expect(
        validateHostVerificationFileSelection(
          selectedFile(1024, 'application/pdf'),
          'GOVERNMENT_ID',
        ),
      ).toBeNull();
      expect(
        validateHostVerificationFileSelection(
          selectedFile(1024, 'application/pdf'),
          'SELFIE',
        ),
      ).toContain('format is not supported');
      expect(
        validateHostVerificationFileSelection(
          selectedFile(5 * 1024 * 1024 + 1, 'image/jpeg'),
          'SELFIE',
        ),
      ).toContain('5 MB limit');
    });

    it('formats safe metadata without requiring a storage location', () => {
      expect(formatPrivateAssetSize(1024)).toBe('1.0 KB');
      expect(formatPrivateAssetSize(2 * 1024 * 1024)).toBe('2.0 MB');
    });
  });

  describe('Creator/API contract preservation', () => {
    const page = creatorSource('pages/HostVerificationPage.tsx');
    const api = creatorSource('services/creator-api.service.ts');
    const app = creatorSource('App.tsx');
    const routes = creatorSource('routes/AppRoutes.tsx');

    it('submits only private asset identifiers for Host verification', () => {
      expect(page).toContain('governmentIdAssetId:');
      expect(page).toContain('selfieAssetId:');
      expect(page).toContain('supportingDocumentAssetIds:');
      expect(page).not.toContain('documentUrl:');
      expect(page).not.toContain('selfieUrl:');
    });

    it('uses the established secure upload, listing, and replacement routes', () => {
      expect(api).toContain("'/hosts/verification/government-id'");
      expect(api).toContain("'/hosts/verification/profile-photo'");
      expect(api).toContain("'/hosts/verification/documents'");
      expect(api).toContain("'/hosts/verification/assets'");
      expect(api).toContain('/replacement`');
    });

    it('does not render private storage keys, paths, providers, or URLs', () => {
      expect(page).not.toMatch(
        /storageKey|storageProvider|privatePath|publicUrl/,
      );
      expect(page).not.toContain('documentUrl');
      expect(page).not.toContain('selfieUrl');
    });

    it('preserves the Creator basename and Host verification route', () => {
      expect(app).toContain('<BrowserRouter basename="/creator">');
      expect(routes).toContain(
        '<Route path="/verification" element={<HostVerificationPage />} />',
      );
    });

    it('rejects every approved masked identity placeholder in the form', () => {
      expect(page).toContain('/[*•●]/.test(val)');
    });
  });
});
