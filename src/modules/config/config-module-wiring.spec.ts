import { MODULE_METADATA } from '@nestjs/common/constants';
import { AdminFeatureFlagsService } from '../admin/admin-feature-flags.service';
import { AdminModule } from '../admin/admin.module';
import { AdminVersionsService } from '../admin/admin-versions.service';
import { SystemSettingsModule } from '../admin/system-settings/system-settings.module';
import { AppConfigModule } from './config.module';

function resolveForwardRef(moduleRef: unknown): unknown {
  if (
    moduleRef &&
    typeof moduleRef === 'object' &&
    'forwardRef' in moduleRef &&
    typeof moduleRef.forwardRef === 'function'
  ) {
    return moduleRef.forwardRef();
  }

  return moduleRef;
}

describe('AppConfigModule provider wiring', () => {
  it('imports AdminModule for every RemoteConfigService dependency', () => {
    const imports = Reflect.getMetadata(
      MODULE_METADATA.IMPORTS,
      AppConfigModule,
    ) as unknown[];

    expect(imports.map(resolveForwardRef)).toContain(AdminModule);
  });

  it('keeps remote-config providers exported through AdminModule', () => {
    const adminProviders = Reflect.getMetadata(
      MODULE_METADATA.PROVIDERS,
      AdminModule,
    ) as unknown[];
    const adminExports = Reflect.getMetadata(
      MODULE_METADATA.EXPORTS,
      AdminModule,
    ) as unknown[];

    expect(adminProviders).toEqual(
      expect.arrayContaining([AdminFeatureFlagsService, AdminVersionsService]),
    );
    expect(adminExports).toEqual(
      expect.arrayContaining([
        SystemSettingsModule,
        AdminFeatureFlagsService,
        AdminVersionsService,
      ]),
    );
  });
});
