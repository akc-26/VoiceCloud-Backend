import { UnauthorizedException } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { Socket } from 'socket.io';
import { PresenceGateway } from './gateways/presence.gateway';
import { RealtimeSocketAuthService } from './services/realtime-socket-auth.service';

function socketWithToken(token = 'valid-token'): Socket {
  return {
    id: 'socket-r13',
    data: {},
    handshake: {
      headers: {},
      auth: { token },
      query: {},
    },
    join: jest.fn().mockResolvedValue(undefined),
    leave: jest.fn().mockResolvedValue(undefined),
  } as unknown as Socket;
}

describe('R13 realtime socket authentication and pause-race regression', () => {
  it('lets a handler await the exact in-flight authentication started by handleConnection', async () => {
    let release!: () => void;
    const barrier = new Promise<void>((resolve) => {
      release = resolve;
    });
    const verifyAccessToken = jest.fn(async () => {
      await barrier;
      return {
        userId: 'creator-r13',
        creatorId: 'creator-r13',
        username: 'creator',
        role: 'CREATOR',
        jti: 'r13-jti',
      };
    });
    const moduleRef = {
      get: jest.fn(() => ({ verifyAccessToken })),
    } as unknown as ModuleRef;
    const auth = new RealtimeSocketAuthService(moduleRef);
    const presence = new PresenceGateway({} as never, auth);
    const client = socketWithToken();

    const connectionAuth = auth.authenticate(client);
    const handlerResult = presence.handlePing(client, { timestamp: 13 });
    release();

    await expect(connectionAuth).resolves.toMatchObject({ userId: 'creator-r13' });
    await expect(handlerResult).resolves.toMatchObject({
      success: true,
      pong: true,
      clientTimestamp: 13,
    });
    expect(verifyAccessToken).toHaveBeenCalledTimes(1);
    expect(client.data.user.userId).toBe('creator-r13');
  });

  it('reuses an already authenticated identity without requiring another token verification', async () => {
    const moduleRef = { get: jest.fn() } as unknown as ModuleRef;
    const auth = new RealtimeSocketAuthService(moduleRef);
    const client = socketWithToken('');
    client.data.user = {
      userId: 'creator-ready',
      creatorId: 'creator-ready',
      role: 'CREATOR',
      jti: 'ready-jti',
    };

    await expect(auth.ensureAuthenticatedUser(client)).resolves.toMatchObject({
      userId: 'creator-ready',
    });
    expect(moduleRef.get).not.toHaveBeenCalled();
  });

  it('continues to fail closed when neither authenticated identity nor handshake token exists', async () => {
    const auth = new RealtimeSocketAuthService({ get: jest.fn() } as unknown as ModuleRef);
    await expect(auth.ensureAuthenticatedUser(socketWithToken(''))).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });
});
