import * as path from 'path';
import * as crypto from 'crypto';
import * as fs from 'fs';
import { PrivateDocumentCategory } from '../enums/private-document-category.enum';

/**
 * Validates and resolves the private storage root path against safety constraints.
 */
export function validatePrivateStoragePath(
  privatePathInput: string | undefined,
  publicUploadDirInput = path.join(process.cwd(), 'uploads'),
  isProduction = process.env.NODE_ENV === 'production',
): string {
  if (isProduction && (!privatePathInput || privatePathInput.trim() === '')) {
    throw new Error(
      'Production environment requires an explicit, non-empty PRIVATE_STORAGE_PATH',
    );
  }

  const rawPath =
    privatePathInput && privatePathInput.trim() !== ''
      ? privatePathInput.trim()
      : 'private_uploads';

  const resolvedPrivate = path.resolve(process.cwd(), rawPath);
  const resolvedPublic = path.resolve(process.cwd(), publicUploadDirInput);

  // 1. Reject if private root itself is a symbolic link
  if (fs.existsSync(resolvedPrivate)) {
    const stat = fs.lstatSync(resolvedPrivate);
    if (stat.isSymbolicLink()) {
      throw new Error('PRIVATE_STORAGE_PATH cannot be a symbolic link');
    }
  }

  // 2. Reject if any existing parent directory component of private root is a symbolic link
  let currentParent = resolvedPrivate;
  while (currentParent && currentParent !== path.parse(currentParent).root) {
    if (fs.existsSync(currentParent)) {
      const lstat = fs.lstatSync(currentParent);
      if (lstat.isSymbolicLink()) {
        throw new Error(
          'PRIVATE_STORAGE_PATH contains a symbolic link parent component',
        );
      }
    }
    currentParent = path.dirname(currentParent);
  }

  // 3. Resolve and compare canonical physical paths
  const canonicalPrivate = fs.existsSync(resolvedPrivate)
    ? fs.realpathSync(resolvedPrivate)
    : resolvedPrivate;
  const canonicalPublic = fs.existsSync(resolvedPublic)
    ? fs.realpathSync(resolvedPublic)
    : resolvedPublic;

  if (canonicalPrivate === canonicalPublic) {
    throw new Error(
      'PRIVATE_STORAGE_PATH cannot be equal to the public upload root',
    );
  }

  const relative = path.relative(canonicalPublic, canonicalPrivate);
  if (
    relative === '' ||
    (!relative.startsWith('..') && !path.isAbsolute(relative))
  ) {
    throw new Error(
      'PRIVATE_STORAGE_PATH cannot be located inside the public upload root',
    );
  }

  return resolvedPrivate;
}

/**
 * Validates a private storage key for security violations.
 */
export function validatePrivateStorageKey(key: string): string {
  if (!key || typeof key !== 'string') {
    throw new Error('Invalid or empty private storage key');
  }

  if (key.includes('\0')) {
    throw new Error('Private storage key contains invalid null bytes');
  }

  if (key.startsWith('/')) {
    throw new Error('Absolute storage key is rejected');
  }

  if (/^[a-zA-Z]:[/\\]/.test(key) || key.startsWith('\\\\')) {
    throw new Error('Absolute Windows storage key is rejected');
  }

  if (key.includes('\\')) {
    throw new Error('Backslash traversal or separator abuse is rejected');
  }

  if (key.includes('..')) {
    throw new Error('Path traversal (..) is rejected');
  }

  const segments = key.split('/');
  for (const segment of segments) {
    if (segment === '' || segment === '.') {
      throw new Error('Invalid key: empty or dot path segment detected');
    }
  }

  return key;
}

/**
 * Generates an opaque, unpredictable private storage key.
 */
export function generateOpaquePrivateStorageKey(
  ownerScope: string,
  category: PrivateDocumentCategory | string,
  extension = '',
): string {
  if (
    !ownerScope ||
    typeof ownerScope !== 'string' ||
    ownerScope.trim() === ''
  ) {
    throw new Error('Invalid owner scope for private key generation');
  }

  const categoryUpper = category.toString().toUpperCase();
  const validCategories = Object.values(PrivateDocumentCategory);
  if (!validCategories.includes(categoryUpper as PrivateDocumentCategory)) {
    throw new Error(`Invalid private document category: ${category}`);
  }

  const opaqueOwnerScope = crypto.randomUUID();
  const randomFilename = crypto.randomUUID();
  const extClean = extension
    ? (extension.startsWith('.') ? extension : `.${extension}`).replace(
        /[^a-zA-Z0-9.]/g,
        '',
      )
    : '';

  return `host-verification/${opaqueOwnerScope}/${categoryUpper}/${randomFilename}${extClean}`;
}
