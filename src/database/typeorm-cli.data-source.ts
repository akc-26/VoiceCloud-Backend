import { AppDataSource } from './data-source';

/**
 * TypeORM CLI entry point.
 *
 * The main data-source module intentionally exposes AppDataSource as both a
 * named and default export for application/test compatibility. TypeORM CLI
 * requires its -d module to expose exactly one DataSource instance, so this
 * wrapper exports only the default instance.
 */
export default AppDataSource;
