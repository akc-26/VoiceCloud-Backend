export enum InfrastructureMode {
  AUTO = 'auto',
  REAL = 'real',
  MEMORY = 'memory',
}

export interface InfrastructureEnvironment {
  NODE_ENV?: string;
  INFRASTRUCTURE_MODE?: string;
  INFRASTRUCTURE_CONNECT_TIMEOUT_MS?: string;
}

const DEFAULT_CONNECT_TIMEOUT_MS = 3000;
const MIN_CONNECT_TIMEOUT_MS = 250;
const MAX_CONNECT_TIMEOUT_MS = 30000;

export function resolveInfrastructureMode(
  environment: InfrastructureEnvironment = process.env,
): InfrastructureMode {
  const defaultMode =
    environment.NODE_ENV === 'test'
      ? InfrastructureMode.MEMORY
      : InfrastructureMode.AUTO;
  const requested = (environment.INFRASTRUCTURE_MODE ?? defaultMode)
    .trim()
    .toLowerCase();

  if (
    !Object.values(InfrastructureMode).includes(requested as InfrastructureMode)
  ) {
    throw new Error(
      `INFRASTRUCTURE_MODE must be one of: ${Object.values(InfrastructureMode).join(', ')}`,
    );
  }

  if (environment.NODE_ENV === 'production') {
    if (requested === InfrastructureMode.MEMORY) {
      throw new Error(
        'INFRASTRUCTURE_MODE=memory is forbidden when NODE_ENV=production',
      );
    }
    return InfrastructureMode.REAL;
  }

  return requested as InfrastructureMode;
}

export function resolveInfrastructureConnectTimeoutMs(
  environment: InfrastructureEnvironment = process.env,
): number {
  const raw =
    environment.INFRASTRUCTURE_CONNECT_TIMEOUT_MS ??
    String(DEFAULT_CONNECT_TIMEOUT_MS);
  const timeout = Number(raw);

  if (
    !Number.isInteger(timeout) ||
    timeout < MIN_CONNECT_TIMEOUT_MS ||
    timeout > MAX_CONNECT_TIMEOUT_MS
  ) {
    throw new Error(
      `INFRASTRUCTURE_CONNECT_TIMEOUT_MS must be an integer between ${MIN_CONNECT_TIMEOUT_MS} and ${MAX_CONNECT_TIMEOUT_MS}`,
    );
  }

  return timeout;
}

export function requiresRealInfrastructure(mode: InfrastructureMode): boolean {
  return mode === InfrastructureMode.REAL;
}
