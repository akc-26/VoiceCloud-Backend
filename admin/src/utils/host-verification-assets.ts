import type {
  HostVerificationAssetData,
  HostVerificationDocumentCategory,
} from '../services/hosts.service';

const CATEGORY_ORDER: Record<HostVerificationDocumentCategory, number> = {
  GOVERNMENT_ID: 0,
  SELFIE: 1,
  SUPPORTING_DOCUMENT: 2,
};

const CATEGORY_LABELS: Record<HostVerificationDocumentCategory, string> = {
  GOVERNMENT_ID: 'Government ID',
  SELFIE: 'Verification selfie',
  SUPPORTING_DOCUMENT: 'Supporting document',
};

export function sortHostVerificationAssets(
  assets: HostVerificationAssetData[],
): HostVerificationAssetData[] {
  return [...assets].sort((left, right) => {
    const categoryDifference =
      CATEGORY_ORDER[left.category] - CATEGORY_ORDER[right.category];
    if (categoryDifference !== 0) return categoryDifference;
    return (
      new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime()
    );
  });
}

export function getHostVerificationCategoryLabel(
  category: HostVerificationDocumentCategory,
): string {
  return CATEGORY_LABELS[category];
}

export function formatHostVerificationAssetSize(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) return 'Unknown size';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function isHostVerificationAssetPreviewable(mimeType: string): boolean {
  const normalized = mimeType.toLowerCase();
  return ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'].includes(
    normalized,
  );
}

export function validateHostVerificationPreviewBlob(
  blob: Blob,
  expectedMimeType: string,
): string | null {
  if (!blob.size) return 'The private document response was empty.';

  const normalizedExpectedType = expectedMimeType.trim().toLowerCase();
  const normalizedResponseType = blob.type.trim().toLowerCase();
  if (
    !isHostVerificationAssetPreviewable(normalizedExpectedType) ||
    normalizedResponseType !== normalizedExpectedType
  ) {
    return 'The private document response did not match its verified format.';
  }

  return null;
}
