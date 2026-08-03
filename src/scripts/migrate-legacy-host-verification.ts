import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { LegacyHostVerificationMigrationService } from '../modules/hosts/legacy-host-verification-migration.service';

async function run(): Promise<void> {
  const application = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn', 'log'],
  });

  try {
    const migration = application.get(LegacyHostVerificationMigrationService);
    const args = new Set(process.argv.slice(2));
    const summary = args.has('--execute')
      ? await migration.execute()
      : args.has('--report')
        ? await migration.report()
        : await migration.preview();

    process.stdout.write(`${JSON.stringify(summary, null, 2)}\n`);
    if (!args.has('--execute') && !args.has('--report')) {
      process.stdout.write(
        'Preview only. Use the dedicated run command to perform migration.\n',
      );
    }
  } finally {
    await application.close();
  }
}

void run().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  process.stderr.write(
    `Legacy Host verification migration failed: ${message}\n`,
  );
  process.exitCode = 1;
});
