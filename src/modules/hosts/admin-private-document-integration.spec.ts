import { readFileSync } from 'fs';
import { resolve } from 'path';
import {
  formatHostVerificationAssetSize,
  isHostVerificationAssetPreviewable,
  sortHostVerificationAssets,
} from '../../../admin/src/utils/host-verification-assets';
import type { HostVerificationAssetData } from '../../../admin/src/services/hosts.service';

function assetFixture(
  assetId: string,
  category: HostVerificationAssetData['category'],
  createdAt = '2026-08-03T00:00:00.000Z',
): HostVerificationAssetData {
  return {
    assetId,
    category,
    originalFilename: `${assetId}.pdf`,
    verifiedMimeType: 'application/pdf',
    verifiedFormat: 'PDF',
    fileSize: 1024,
    validationStatus: 'VALIDATED',
    isActive: true,
    linkedToApplication: true,
    createdAt,
  };
}

function source(relativePath: string): string {
  return readFileSync(resolve(process.cwd(), relativePath), 'utf8');
}

describe('Admin private Host document integration (B2B-2)', () => {
  describe('Safe metadata presentation', () => {
    it('orders identity, selfie, and multiple supporting documents predictably', () => {
      const result = sortHostVerificationAssets([
        assetFixture('support-old', 'SUPPORTING_DOCUMENT'),
        assetFixture('selfie', 'SELFIE'),
        assetFixture('government', 'GOVERNMENT_ID'),
        assetFixture(
          'support-new',
          'SUPPORTING_DOCUMENT',
          '2026-08-04T00:00:00.000Z',
        ),
      ]);

      expect(result.map((asset) => asset.assetId)).toEqual([
        'government',
        'selfie',
        'support-new',
        'support-old',
      ]);
    });

    it('formats only safe file-size metadata', () => {
      expect(formatHostVerificationAssetSize(1024)).toBe('1.0 KB');
      expect(formatHostVerificationAssetSize(3 * 1024 * 1024)).toBe('3.0 MB');
      expect(formatHostVerificationAssetSize(-1)).toBe('Unknown size');
    });

    it('fails closed for an unrecognized preview MIME type', () => {
      expect(isHostVerificationAssetPreviewable('application/pdf')).toBe(true);
      expect(isHostVerificationAssetPreviewable('image/jpeg')).toBe(true);
      expect(isHostVerificationAssetPreviewable('text/html')).toBe(false);
      expect(isHostVerificationAssetPreviewable('image/svg+xml')).toBe(false);
    });
  });

  describe('Admin secure-review contract', () => {
    const adminService = source('admin/src/services/hosts.service.ts');
    const dialog = source(
      'admin/src/components/hosts/HostVerificationDocumentsDialog.tsx',
    );
    const page = source('admin/src/pages/HostsPage.tsx');
    const app = source('admin/src/App.tsx');
    const routes = source('admin/src/routes/AppRoutes.tsx');
    const controller = source('src/modules/hosts/hosts.controller.ts');
    const assetService = source(
      'src/modules/hosts/host-verification-asset.service.ts',
    );

    it('uses the Admin-only metadata route and authorized blob content route', () => {
      expect(adminService).toContain(
        '/hosts/admin/applications/${encodeURIComponent(hostId)}/verification-assets',
      );
      expect(adminService).toContain(
        '/hosts/verification/assets/${encodeURIComponent(assetId)}/content',
      );
      expect(adminService).toContain("responseType: 'blob'");
    });

    it('does not use legacy or permanent document URLs in Admin review', () => {
      const reviewSource = `${adminService}\n${dialog}\n${page}`;
      expect(reviewSource).not.toMatch(/documentUrl|selfieUrl|storageKey/);
      expect(reviewSource).not.toMatch(/storageProvider|privatePath|publicUrl/);
    });

    it('revokes every temporary object URL when review changes or closes', () => {
      expect(dialog).toContain('URL.createObjectURL(blob)');
      expect(dialog).toContain('URL.revokeObjectURL(previewUrlRef.current)');
      expect(dialog).toContain('URL.revokeObjectURL(objectUrl)');
      expect(dialog).toContain('releasePreview();');
    });

    it('sandboxes PDF previews and prevents referrer disclosure', () => {
      expect(dialog).toContain('sandbox=""');
      expect(dialog).toContain('referrerPolicy="no-referrer"');
      expect(dialog).not.toContain('allow-scripts');
    });

    it('provides loading, empty, error, retry, and secure-review states', () => {
      expect(dialog).toContain('Loading secure document metadata...');
      expect(dialog).toContain('No current private verification documents');
      expect(dialog).toContain('Retry');
      expect(dialog).toContain('Review securely');
      expect(dialog).toContain('Opening private document...');
    });

    it('makes secure review available from applications and active Hosts', () => {
      expect(page.match(/setDocumentsDialogHost\(row\)/g)).toHaveLength(2);
      expect(page).toContain('<HostVerificationDocumentsDialog');
    });

    it('preserves Admin and Super Admin authorization on metadata access', () => {
      const routeStart = controller.indexOf(
        "@Get('admin/applications/:hostId/verification-assets')",
      );
      const routeEnd = controller.indexOf("@Get('admin/earnings')", routeStart);
      const route = controller.slice(routeStart, routeEnd);

      expect(routeStart).toBeGreaterThan(-1);
      expect(route).toContain('@UseGuards(RolesGuard)');
      expect(route).toContain('@Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)');
    });

    it('keeps non-administrator and unlinked-asset protections authoritative', () => {
      expect(assetService).toContain('if (!isOwner && !isAdministrator)');
      expect(assetService).toContain(
        'Administrators can only access assets linked to a Host application',
      );
    });

    it('preserves the locked Admin basename and Hosts route', () => {
      expect(app).toContain('<BrowserRouter basename="/admin">');
      expect(routes).toContain(
        '<Route path="/hosts" element={<HostsPage />} />',
      );
    });
  });
});
