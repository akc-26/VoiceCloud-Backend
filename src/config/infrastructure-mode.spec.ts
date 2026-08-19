import {
  InfrastructureMode,
  requiresRealInfrastructure,
  resolveInfrastructureConnectTimeoutMs,
  resolveInfrastructureMode,
} from './infrastructure-mode';

describe('Infrastructure mode', () => {
  it('defaults development execution to auto mode', () => {
    expect(resolveInfrastructureMode({ NODE_ENV: 'development' })).toBe(
      InfrastructureMode.AUTO,
    );
  });

  it('defaults Jest/test execution to deterministic memory mode', () => {
    expect(resolveInfrastructureMode({ NODE_ENV: 'test' })).toBe(
      InfrastructureMode.MEMORY,
    );
  });

  it('accepts explicit real and memory modes outside production', () => {
    expect(
      resolveInfrastructureMode({
        NODE_ENV: 'development',
        INFRASTRUCTURE_MODE: 'REAL',
      }),
    ).toBe(InfrastructureMode.REAL);
    expect(
      resolveInfrastructureMode({
        NODE_ENV: 'test',
        INFRASTRUCTURE_MODE: 'memory',
      }),
    ).toBe(InfrastructureMode.MEMORY);
  });

  it('forces production auto mode to real infrastructure', () => {
    expect(
      resolveInfrastructureMode({
        NODE_ENV: 'production',
        INFRASTRUCTURE_MODE: 'auto',
      }),
    ).toBe(InfrastructureMode.REAL);
  });

  it('rejects memory infrastructure in production', () => {
    expect(() =>
      resolveInfrastructureMode({
        NODE_ENV: 'production',
        INFRASTRUCTURE_MODE: 'memory',
      }),
    ).toThrow('forbidden');
  });

  it('rejects unknown modes', () => {
    expect(() =>
      resolveInfrastructureMode({
        NODE_ENV: 'development',
        INFRASTRUCTURE_MODE: 'silent-fallback',
      }),
    ).toThrow('INFRASTRUCTURE_MODE');
  });

  it('validates infrastructure connection timeout bounds', () => {
    expect(resolveInfrastructureConnectTimeoutMs({})).toBe(3000);
    expect(
      resolveInfrastructureConnectTimeoutMs({
        INFRASTRUCTURE_CONNECT_TIMEOUT_MS: '5000',
      }),
    ).toBe(5000);
    expect(() =>
      resolveInfrastructureConnectTimeoutMs({
        INFRASTRUCTURE_CONNECT_TIMEOUT_MS: '100',
      }),
    ).toThrow('INFRASTRUCTURE_CONNECT_TIMEOUT_MS');
  });

  it('identifies strict real-infrastructure mode', () => {
    expect(requiresRealInfrastructure(InfrastructureMode.REAL)).toBe(true);
    expect(requiresRealInfrastructure(InfrastructureMode.AUTO)).toBe(false);
    expect(requiresRealInfrastructure(InfrastructureMode.MEMORY)).toBe(false);
  });
});
