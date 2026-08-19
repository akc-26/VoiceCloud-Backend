import {
  HostVerificationAsset,
  HostVerificationDocumentCategory,
} from '../types/creator.types';

export function activeAssetsForCategory(
  assets: HostVerificationAsset[],
  category: HostVerificationDocumentCategory,
): HostVerificationAsset[] {
  return assets
    .filter(
      (asset) =>
        asset.category === category &&
        asset.isActive &&
        asset.validationStatus === 'VALIDATED',
    )
    .sort(
      (left, right) =>
        new Date(right.createdAt).getTime() -
        new Date(left.createdAt).getTime(),
    );
}

export function preferredAssetForCategory(
  assets: HostVerificationAsset[],
  category: HostVerificationDocumentCategory,
): HostVerificationAsset | null {
  const matching = activeAssetsForCategory(assets, category);
  return (
    matching.find((asset) => asset.linkedToApplication) || matching[0] || null
  );
}

export function formatPrivateAssetSize(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) return 'Unknown size';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

const FILE_RULES: Record<
  HostVerificationDocumentCategory,
  { maxSize: number; mimeTypes: string[]; label: string }
> = {
  GOVERNMENT_ID: {
    maxSize: 10 * 1024 * 1024,
    mimeTypes: ['image/jpeg', 'image/png', 'application/pdf'],
    label: 'Government ID',
  },
  SELFIE: {
    maxSize: 5 * 1024 * 1024,
    mimeTypes: ['image/jpeg', 'image/png', 'image/webp'],
    label: 'Selfie',
  },
  SUPPORTING_DOCUMENT: {
    maxSize: 20 * 1024 * 1024,
    mimeTypes: ['image/jpeg', 'image/png', 'application/pdf'],
    label: 'Supporting document',
  },
};

export function validateHostVerificationFileSelection(
  file: File,
  category: HostVerificationDocumentCategory,
): string | null {
  const rule = FILE_RULES[category];
  if (!file || file.size <= 0) return `${rule.label} cannot be empty.`;
  if (file.size > rule.maxSize) {
    return `${rule.label} exceeds the ${(rule.maxSize / (1024 * 1024)).toFixed(0)} MB limit.`;
  }
  if (file.type && !rule.mimeTypes.includes(file.type.toLowerCase())) {
    return `${rule.label} format is not supported.`;
  }
  return null;
}
