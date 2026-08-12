import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = process.cwd();
const read = (path) => readFileSync(resolve(root, path), 'utf8');

const checks = [];
const pass = (name, condition) => {
  if (!condition) throw new Error(`FAIL ${name}`);
  console.log(`PASS ${name}`);
  checks.push(name);
};

const page = read('admin/src/pages/ProviderConfigsPage.tsx');
const adminService = read('admin/src/services/admin.service.ts');
const providersService = read('src/modules/admin/admin-providers.service.ts');
const factory = read('src/modules/storage/storage.factory.ts');
const storageService = read('src/modules/storage/storage.service.ts');
const factorySpec = read('src/modules/storage/storage.factory.spec.ts');

pass(
  'provider-update-payload-whitelists-update-dto-fields',
  page.includes('const payload: UpdateProviderConfigRequest = {') &&
    !page.includes('const payload = {\n        ...selectedProvider'),
);

pass(
  'provider-create-payload-whitelists-create-dto-fields',
  page.includes('const payload: CreateProviderConfigRequest = {') &&
    page.includes('category: selectedProvider.category || activeTab') &&
    page.includes('providerType:'),
);

pass(
  'provider-all-category-default-types-covered',
  [
    "rtc: 'agora'",
    "storage: 'minio'",
    "payment: 'razorpay'",
    "firebase: 'firebase'",
    "email: 'smtp'",
    "sms: 'twilio'",
    "ai: 'gemini'",
    "maps: 'google_maps'",
  ].every((entry) => page.includes(entry)),
);

pass(
  'provider-edit-does-not-resubmit-masked-secrets',
  page.includes('omitMaskedSecrets') && page.includes("value.includes('••••')"),
);

pass(
  'provider-backend-defensively-preserves-masked-secrets',
  providersService.includes('private mergeProviderConfig(') &&
    providersService.includes("value.includes('••••')") &&
    providersService.includes('this.mergeProviderConfig('),
);

pass(
  'provider-client-request-contracts-are-separated-from-response-shape',
  adminService.includes('export interface CreateProviderConfigRequest') &&
    adminService.includes('export interface UpdateProviderConfigRequest') &&
    adminService.includes('async updateProviderConfig(id: string, dto: UpdateProviderConfigRequest)'),
);

pass(
  'provider-edit-surfaces-backend-validation-errors',
  page.includes('extractApiErrorMessage') &&
    page.includes("extractApiErrorMessage(err, 'Failed to save provider configuration')"),
);

pass(
  'private-host-assets-use-dedicated-local-private-driver',
  factory.includes('async getPrivateDriver(): Promise<IStorageDriver>') &&
    factory.includes('return this.localDriver;') &&
    storageService.match(/getPrivateDriver\(\)/g)?.length >= 4,
);

pass(
  'public-provider-storage-selection-remains-unchanged',
  factory.includes('async getActiveDriver(): Promise<IStorageDriver>') &&
    factory.includes('ProviderCategory.STORAGE') &&
    factory.includes('return this.s3Driver;'),
);

pass(
  'private-driver-isolation-has-regression-test',
  factorySpec.includes('always isolates private objects to the confined local private driver'),
);

console.log(`WP09 R06 provider/private-storage source check passed: ${checks.length}/10`);
