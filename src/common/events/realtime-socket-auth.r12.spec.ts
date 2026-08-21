import { UnauthorizedException } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { Socket } from 'socket.io';
import { RealtimeSocketAuthService } from './services/realtime-socket-auth.service';

function socketWithToken(token = 'valid-token'): Socket {
  return {
    data: {},
    handshake: {
      headers: {},
      auth: { token },
    },
  } as unknown as Socket;
}

describe('R12 realtime socket authentication gate', () => {
  it('shares one in-flight JWT verification between connection and message handlers', async () => {
    let release!: () => void;
    const barrier = new Promise<void>((resolve) => { release = resolve; });
    const verifyAccessToken = jest.fn(async () => {
      await barrier;
      return {
        userId: 'creator-1',
        creatorId: 'creator-1',
        username: 'creator',
        role: 'CREATOR',
        jti: 'jti-1',
      };
    });
    const moduleRef = {
      get: jest.fn(() => ({ verifyAccessToken })),
    } as unknown as ModuleRef;
    const service = new RealtimeSocketAuthService(moduleRef);
    const client = socketWithToken();

    const connectionAuth = service.authenticate(client);
    const handlerAuth = service.ensureAuthenticatedUser(client);
    release();

    await expect(connectionAuth).resolves.toMatchObject({ userId: 'creator-1' });
    await expect(handlerAuth).resolves.toMatchObject({ userId: 'creator-1' });
    expect(verifyAccessToken).toHaveBeenCalledTimes(1);
    expect(client.data.user.userId).toBe('creator-1');
  });

  it('still fails closed when no handshake token is available', async () => {
    const service = new RealtimeSocketAuthService({ get: jest.fn() } as unknown as ModuleRef);
    const client = socketWithToken('');
    await expect(service.ensureAuthenticatedUser(client)).rejects.toBeInstanceOf(UnauthorizedException);
  });
});
