import { readFileSync } from 'fs';
import { resolve } from 'path';
import { validateHostVerificationPreviewBlob } from '../../../admin/src/utils/host-verification-assets';

function source(relativePath: string): string {
  return readFileSync(resolve(process.cwd(), relativePath), 'utf8');
}

describe('Private Host document cross-application acceptance (B2B-3)', () => {
  const creatorPage = source('creator/src/pages/HostVerificationPage.tsx');
  const creatorApi = source('creator/src/services/creator-api.service.ts');
  const creatorTypes = source('creator/src/types/creator.types.ts');
  const adminDialog = source(
    'admin/src/components/hosts/HostVerificationDocumentsDialog.tsx',
  );
  const adminService = source('admin/src/services/hosts.service.ts');
  const responseDto = source(
    'src/modules/hosts/dto/host-verification-asset-response.dto.ts',
  );
  const applyDto = source('src/modules/hosts/dto/apply-host.dto.ts');
  const controller = source('src/modules/hosts/hosts.controller.ts');
  const assetService = source(
    'src/modules/hosts/host-verification-asset.service.ts',
  );

  describe('End-to-end contract continuity', () => {
    it('keeps the Creator upload, asset-ID application, and Admin review route chain aligned', () => {
      expect(creatorApi).toContain("'/hosts/verification/government-id'");
      expect(creatorApi).toContain("'/hosts/verification/profile-photo'");
      expect(creatorApi).toContain("'/hosts/verification/documents'");
      expect(creatorApi).toContain("'/hosts/verification/assets'");
      expect(creatorPage).toContain('governmentIdAssetId:');
      expect(creatorPage).toContain('selfieAssetId:');
      expect(creatorPage).toContain('supportingDocumentAssetIds:');
      expect(adminService).toContain(
        '/hosts/admin/applications/${encodeURIComponent(hostId)}/verification-assets',
      );
      expect(adminService).toContain(
        '/hosts/verification/assets/${encodeURIComponent(assetId)}/content',
      );
    });

    it('keeps the safe asset metadata contract aligned across Backend, Creator, and Admin', () => {
      for (const field of [
        'assetId',
        'category',
        'originalFilename',
        'verifiedMimeType',
        'verifiedFormat',
        'fileSize',
        'validationStatus',
        'isActive',
        'linkedToApplication',
        'createdAt',
      ]) {
        expect(responseDto).toContain(field);
        expect(creatorTypes).toContain(field);
        expect(adminService).toContain(field);
      }
    });

    it('does not expose private storage details through either web application contract', () => {
      const webContracts = `${creatorTypes}\n${creatorPage}\n${adminService}\n${adminDialog}`;
      expect(webContracts).not.toMatch(
        /storageKey|storageProvider|privatePath|absolutePath|publicUrl/,
      );
      expect(creatorPage).not.toMatch(/documentUrl|selfieUrl/);
      expect(adminDialog).not.toMatch(/documentUrl|selfieUrl/);
    });

    it('preserves deprecated legacy application fields only for existing client compatibility', () => {
      expect(applyDto).toContain('documentUrl?: string;');
      expect(applyDto).toContain('selfieUrl?: string;');
      expect(applyDto.match(/deprecated: true/g)).toHaveLength(2);
      expect(creatorTypes).not.toMatch(/documentUrl|selfieUrl/);
    });

    it('preserves Creator and Admin basenames and Host review routes', () => {
      expect(source('creator/src/App.tsx')).toContain(
        '<BrowserRouter basename="/creator">',
      );
      expect(source('creator/src/routes/AppRoutes.tsx')).toContain(
        '<Route path="/verification" element={<HostVerificationPage />} />',
      );
      expect(source('admin/src/App.tsx')).toContain(
        '<BrowserRouter basename="/admin">',
      );
      expect(source('admin/src/routes/AppRoutes.tsx')).toContain(
        '<Route path="/hosts" element={<HostsPage />} />',
      );
    });
  });

  describe('Failure-path security', () => {
    it('fails closed when the Creator cannot load authoritative private asset state', () => {
      expect(creatorPage).toContain('setAssetLoadError(assetResult.error)');
      expect(creatorPage).toMatch(
        /Upload\s+and submission are paused to protect the current document\s+state/,
      );
      expect(creatorPage).toContain('!!assetLoadError');
      expect(creatorPage).not.toContain(
        'creatorApi.getHostVerificationAssets().catch(() => [])',
      );
    });

    it('supports retry after a Creator asset-state failure without fabricating document state', () => {
      expect(creatorPage).toContain('refreshVerificationAssets().catch(');
      expect(creatorPage).toContain('setAssetLoadError(null)');
      expect(creatorPage).toContain('setVerificationAssets(assets)');
    });

    it('accepts only non-empty preview content matching the verified MIME type', () => {
      expect(
        validateHostVerificationPreviewBlob(
          new Blob(['private'], { type: 'application/pdf' }),
          'application/pdf',
        ),
      ).toBeNull();
      expect(
        validateHostVerificationPreviewBlob(
          new Blob([], { type: 'application/pdf' }),
          'application/pdf',
        ),
      ).toContain('empty');
      expect(
        validateHostVerificationPreviewBlob(
          new Blob(['private'], { type: 'text/html' }),
          'application/pdf',
        ),
      ).toContain('did not match');
      expect(
        validateHostVerificationPreviewBlob(
          new Blob(['private'], { type: 'image/svg+xml' }),
          'image/svg+xml',
        ),
      ).toContain('did not match');
    });

    it('cancels an in-flight Admin preview and never coerces mismatched content', () => {
      expect(adminDialog).toContain('previewAbortRef.current?.abort()');
      expect(adminDialog).toContain('controller.signal');
      expect(adminDialog).toContain('validateHostVerificationPreviewBlob(');
      expect(adminDialog).not.toContain('new Blob([blob]');
      expect(adminService).toContain('signal,');
    });

    it('retains secure content headers and Backend authorization as the authority', () => {
      expect(controller).toContain("'Cache-Control', 'private, no-store");
      expect(controller).toContain("'X-Content-Type-Options', 'nosniff'");
      expect(controller).toContain(
        "'Cross-Origin-Resource-Policy', 'same-origin'",
      );
      expect(controller).toContain('"default-src \'none\'; sandbox"');
      expect(assetService).toContain('if (!isOwner && !isAdministrator)');
      expect(assetService).toContain(
        'Administrators can only access assets linked to a Host application',
      );
      expect(assetService).toContain('this.assertCurrentPrivateAsset(asset');
    });

    it('retains explicit legacy re-upload guidance in Creator and Admin workflows', () => {
      expect(creatorPage).toContain('legacy verification files are no longer');
      expect(adminDialog).toContain(
        'Legacy public files are not used; the applicant',
      );
    });
  });
});
