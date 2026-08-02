import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { StorageModule } from './storage.module';
import { LocalStorageDriver } from './drivers/local-storage.driver';
import { S3StorageDriver } from './drivers/s3-storage.driver';
import { StorageFactory } from './storage.factory';
import { StorageService } from './storage.service';
import { PrivateDocumentCategory } from './enums/private-document-category.enum';
import { MediaCategory } from './enums/media-category.enum';
import {
  validatePrivateStoragePath,
  validatePrivateStorageKey,
  generateOpaquePrivateStorageKey,
} from './utils/private-storage-key.util';

describe('Secure Private Storage Driver Foundation (B2A-1A)', () => {
  let tmpBaseDir: string;
  let publicUploadsDir: string;
  let validPrivateDir: string;

  beforeAll(() => {
    tmpBaseDir = fs.mkdtempSync(path.join(os.tmpdir(), 'vc-storage-test-'));
    publicUploadsDir = path.join(tmpBaseDir, 'uploads');
    validPrivateDir = path.join(tmpBaseDir, 'private_uploads');

    fs.mkdirSync(publicUploadsDir, { recursive: true });
    fs.mkdirSync(validPrivateDir, { recursive: true });
  });

  afterAll(() => {
    if (fs.existsSync(tmpBaseDir)) {
      fs.rmSync(tmpBaseDir, { recursive: true, force: true });
    }
  });

  describe('Configuration & Path Boundary Constraints', () => {
    it('1. A private root outside public uploads is accepted', () => {
      const resolved = validatePrivateStoragePath(
        validPrivateDir,
        publicUploadsDir,
        false,
      );
      expect(resolved).toBe(path.resolve(validPrivateDir));
    });

    it('2. A private root equal to public uploads is rejected', () => {
      expect(() =>
        validatePrivateStoragePath(publicUploadsDir, publicUploadsDir, false),
      ).toThrow(
        'PRIVATE_STORAGE_PATH cannot be equal to the public upload root',
      );
    });

    it('3. A private root inside public uploads is rejected', () => {
      const insideDir = path.join(publicUploadsDir, 'private_inside');
      expect(() =>
        validatePrivateStoragePath(insideDir, publicUploadsDir, false),
      ).toThrow(
        'PRIVATE_STORAGE_PATH cannot be located inside the public upload root',
      );
    });

    it('4. A safe sibling path with a similar prefix is handled correctly', () => {
      const siblingDir = path.join(tmpBaseDir, 'uploads-private');
      const resolved = validatePrivateStoragePath(
        siblingDir,
        publicUploadsDir,
        false,
      );
      expect(resolved).toBe(path.resolve(siblingDir));
    });

    it('5. Empty production private path is rejected', () => {
      expect(() =>
        validatePrivateStoragePath('', publicUploadsDir, true),
      ).toThrow(
        'Production environment requires an explicit, non-empty PRIVATE_STORAGE_PATH',
      );
      expect(() =>
        validatePrivateStoragePath('   ', publicUploadsDir, true),
      ).toThrow(
        'Production environment requires an explicit, non-empty PRIVATE_STORAGE_PATH',
      );
    });

    it('6. Private root that is a symbolic link into public uploads is rejected', () => {
      const symlinkRoot = path.join(tmpBaseDir, 'symlink_private_to_public');
      try {
        fs.symlinkSync(publicUploadsDir, symlinkRoot, 'dir');
      } catch {
        // Ignored
      }

      if (fs.existsSync(symlinkRoot)) {
        expect(() =>
          validatePrivateStoragePath(symlinkRoot, publicUploadsDir, false),
        ).toThrow();
      }
    });

    it('7. Private root that is a symbolic link outside physical root is rejected', () => {
      const externalTarget = path.join(tmpBaseDir, 'external_target');
      fs.mkdirSync(externalTarget, { recursive: true });
      const symlinkRoot = path.join(tmpBaseDir, 'symlink_private_external');
      try {
        fs.symlinkSync(externalTarget, symlinkRoot, 'dir');
      } catch {
        // Ignored
      }

      if (fs.existsSync(symlinkRoot)) {
        expect(() =>
          validatePrivateStoragePath(symlinkRoot, publicUploadsDir, false),
        ).toThrow('PRIVATE_STORAGE_PATH cannot be a symbolic link');
      }
    });
  });

  describe('Key Validation & Key Generation', () => {
    it('8. Absolute Unix storage key is rejected', () => {
      expect(() => validatePrivateStorageKey('/etc/passwd')).toThrow(
        'Absolute storage key is rejected',
      );
    });

    it('9. Absolute Windows storage key is rejected', () => {
      expect(() =>
        validatePrivateStorageKey('C:\\Windows\\System32\\config'),
      ).toThrow('Absolute Windows storage key is rejected');
      expect(() => validatePrivateStorageKey('D:/data/secret')).toThrow(
        'Absolute Windows storage key is rejected',
      );
      expect(() =>
        validatePrivateStorageKey('\\\\server\\share\\file'),
      ).toThrow('Absolute Windows storage key is rejected');
    });

    it('10. ../ traversal is rejected', () => {
      expect(() =>
        validatePrivateStorageKey('host-verification/../secret'),
      ).toThrow('Path traversal (..) is rejected');
    });

    it('11. Backslash traversal is rejected', () => {
      expect(() =>
        validatePrivateStorageKey('host-verification\\sub\\file'),
      ).toThrow('Backslash traversal or separator abuse is rejected');
    });

    it('12. Null-byte input is rejected', () => {
      expect(() =>
        validatePrivateStorageKey(
          'host-verification/file' + String.fromCharCode(0) + '.png',
        ),
      ).toThrow('Private storage key contains invalid null bytes');
    });

    it('13. Resolved normal path remains inside the private root', () => {
      const driver = new LocalStorageDriver(validPrivateDir);
      const safeKey = generateOpaquePrivateStorageKey(
        'owner123',
        PrivateDocumentCategory.GOVERNMENT_ID,
        '.pdf',
      );
      const resolved = driver.resolvePrivatePath(safeKey);

      expect(resolved.startsWith(path.resolve(validPrivateDir))).toBe(true);
      const relative = path.relative(path.resolve(validPrivateDir), resolved);
      expect(relative.startsWith('..')).toBe(false);
    });

    it('14. Opaque key generation conceals email address', () => {
      const email = 'owner@example.com';
      const key = generateOpaquePrivateStorageKey(
        email,
        PrivateDocumentCategory.GOVERNMENT_ID,
        '.pdf',
      );

      expect(key.includes('owner')).toBe(false);
      expect(key.includes('example')).toBe(false);
      expect(key.includes('ownerexamplecom')).toBe(false);
      expect(key.startsWith('host-verification/')).toBe(true);
      expect(key.endsWith('.pdf')).toBe(true);
    });

    it('15. Opaque key generation conceals phone number', () => {
      const phone = '+15551234567';
      const key = generateOpaquePrivateStorageKey(
        phone,
        PrivateDocumentCategory.SELFIE,
        '.jpg',
      );

      expect(key.includes('15551234567')).toBe(false);
      expect(key.includes('555')).toBe(false);
    });

    it('16. Opaque key generation conceals username and UUID owner ID', () => {
      const username = 'john_doe';
      const uuid = '550e8400-e29b-41d4-a716-446655440000';

      const keyUser = generateOpaquePrivateStorageKey(
        username,
        PrivateDocumentCategory.SUPPORTING_DOCUMENT,
        '.png',
      );
      const keyUuid = generateOpaquePrivateStorageKey(
        uuid,
        PrivateDocumentCategory.GOVERNMENT_ID,
        '.pdf',
      );

      expect(keyUser.includes('john')).toBe(false);
      expect(keyUuid.includes('550e8400')).toBe(false);
    });
  });

  describe('Local Private Storage Operations', () => {
    let localDriver: LocalStorageDriver;

    beforeEach(() => {
      localDriver = new LocalStorageDriver(validPrivateDir);
    });

    it('17. Private local write succeeds', async () => {
      const key = generateOpaquePrivateStorageKey(
        'owner1',
        PrivateDocumentCategory.GOVERNMENT_ID,
        '.bin',
      );
      const data = Buffer.from('TEST_PRIVATE_DATA_CONTENT');

      await expect(localDriver.writePrivate(key, data)).resolves.not.toThrow();
    });

    it('18. Private local read succeeds', async () => {
      const key = generateOpaquePrivateStorageKey(
        'owner1',
        PrivateDocumentCategory.SELFIE,
        '.jpg',
      );
      const data = Buffer.from('SELFIE_IMAGE_BUFFER');

      await localDriver.writePrivate(key, data);
      const readData = await localDriver.readPrivate(key);

      expect(readData.toString()).toBe('SELFIE_IMAGE_BUFFER');
    });

    it('19. Private local existence check succeeds', async () => {
      const key = generateOpaquePrivateStorageKey(
        'owner1',
        PrivateDocumentCategory.SUPPORTING_DOCUMENT,
        '.pdf',
      );

      expect(await localDriver.existsPrivate(key)).toBe(false);

      await localDriver.writePrivate(key, Buffer.from('DOC_DATA'));

      expect(await localDriver.existsPrivate(key)).toBe(true);
    });

    it('20. Private local delete succeeds', async () => {
      const key = generateOpaquePrivateStorageKey(
        'owner1',
        PrivateDocumentCategory.GOVERNMENT_ID,
        '.png',
      );

      await localDriver.writePrivate(key, Buffer.from('ID_DATA'));
      expect(await localDriver.existsPrivate(key)).toBe(true);

      const deleted = await localDriver.deletePrivate(key);
      expect(deleted).toBe(true);
      expect(await localDriver.existsPrivate(key)).toBe(false);
    });

    it('21. Invalid-key existence check rejects instead of returning false', async () => {
      const maliciousKey = '../etc/passwd';
      await expect(localDriver.existsPrivate(maliciousKey)).rejects.toThrow(
        'Path traversal (..) is rejected',
      );

      const nullByteKey =
        'host-verification/file' + String.fromCharCode(0) + '.txt';
      await expect(localDriver.existsPrivate(nullByteKey)).rejects.toThrow(
        'Private storage key contains invalid null bytes',
      );
    });

    it('22. An intermediate symlink inside private root cannot escape and creates no target file', async () => {
      const outerTargetDir = path.join(tmpBaseDir, 'external_stolen_dir');
      fs.mkdirSync(outerTargetDir, { recursive: true });

      const subScope = 'host-verification/symlink_scope';
      const scopeFull = path.join(validPrivateDir, subScope);
      fs.mkdirSync(path.dirname(scopeFull), { recursive: true });

      try {
        fs.symlinkSync(outerTargetDir, scopeFull, 'dir');
      } catch {
        // Ignored
      }

      if (fs.existsSync(scopeFull)) {
        const escapeKey = `${subScope}/stolen_doc.pdf`;
        await expect(
          localDriver.writePrivate(escapeKey, Buffer.from('SENSITIVE_LEAK')),
        ).rejects.toThrow();

        const externalTargetFile = path.join(outerTargetDir, 'stolen_doc.pdf');
        expect(fs.existsSync(externalTargetFile)).toBe(false);
      }
    });

    it('23. Existing public local storage behaviour remains unchanged', async () => {
      const mockFile: Express.Multer.File = {
        fieldname: 'file',
        originalname: 'public_image.png',
        encoding: '7bit',
        mimetype: 'image/png',
        buffer: Buffer.from('PUBLIC_IMAGE_CONTENT'),
        size: 20,
        stream: null,
        destination: '',
        filename: '',
        path: '',
      };

      const result = await localDriver.upload(mockFile, MediaCategory.AVATAR);
      expect(result.filePath.startsWith('uploads/avatar/')).toBe(true);
      expect(result.publicUrl).toBe(`/${result.filePath}`);

      const meta = await localDriver.getMetadata(result.filePath);
      expect(meta?.exists).toBe(true);

      const deleted = await localDriver.delete(result.filePath);
      expect(deleted).toBe(true);
    });

    it('24. A public filename containing "private" remains valid', async () => {
      const mockFile: Express.Multer.File = {
        fieldname: 'file',
        originalname: 'private-profile.png',
        encoding: '7bit',
        mimetype: 'image/png',
        buffer: Buffer.from('AVATAR_CONTENT'),
        size: 14,
        stream: null,
        destination: '',
        filename: '',
        path: '',
      };

      const result = await localDriver.upload(mockFile, MediaCategory.AVATAR);
      expect(result.filename).toBe('private-profile.png');
      expect(result.filePath.startsWith('uploads/avatar/')).toBe(true);
      expect(result.publicUrl).toBe(`/${result.filePath}`);

      const meta = await localDriver.getMetadata(result.filePath);
      expect(meta?.exists).toBe(true);

      await localDriver.delete(result.filePath);
    });
  });

  describe('Module & Provider Registration & S3 Provider Preservation', () => {
    it('25. Inspects actual StorageModule registration and confirms required providers', () => {
      const providers = Reflect.getMetadata('providers', StorageModule) || [];

      expect(providers).toContain(LocalStorageDriver);
      expect(providers).toContain(S3StorageDriver);
      expect(providers).toContain(StorageFactory);
      expect(providers).toContain(StorageService);
    });

    it('26. Unsupported S3 private operations fail explicitly and securely', async () => {
      const s3Driver = new S3StorageDriver();

      await expect(
        s3Driver.writePrivate('key', Buffer.from('DATA')),
      ).rejects.toThrow(
        'S3 private storage operations are unsupported in this subpart',
      );

      await expect(s3Driver.readPrivate('key')).rejects.toThrow(
        'S3 private storage operations are unsupported in this subpart',
      );

      await expect(s3Driver.existsPrivate('key')).rejects.toThrow(
        'S3 private storage operations are unsupported in this subpart',
      );

      await expect(s3Driver.deletePrivate('key')).rejects.toThrow(
        'S3 private storage operations are unsupported in this subpart',
      );
    });

    it('27. No in-memory fake S3 persistence is introduced', () => {
      const s3Driver = new S3StorageDriver();
      const keys = Object.keys(s3Driver);

      for (const k of keys) {
        expect(s3Driver[k as keyof typeof s3Driver]).not.toBeInstanceOf(Map);
        expect(s3Driver[k as keyof typeof s3Driver]).not.toBeInstanceOf(Set);
      }
    });
  });
});
