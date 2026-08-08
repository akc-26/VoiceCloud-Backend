import { EventsGateway } from './events.gateway';

describe('Notification realtime isolation', () => {
  it('routes user-scoped notification events only to the authenticated user room', () => {
    const emit = jest.fn();
    const to = jest.fn().mockReturnValue({ emit });
    const broadcast = jest.fn();
    const gateway = new EventsGateway({} as any, {} as any);
    gateway.server = { to, emit: broadcast } as any;

    const payload = {
      userId: 'creator-1',
      notification: { id: 'notification-1' },
    };

    gateway.broadcastNotificationEvent('notification:new', payload);

    expect(to).toHaveBeenCalledWith('user:creator-1');
    expect(emit).toHaveBeenCalledWith('notification:new', payload);
    expect(broadcast).not.toHaveBeenCalled();
  });

  it('preserves the generic fallback only when no user scope is provided', () => {
    const emit = jest.fn();
    const to = jest.fn();
    const gateway = new EventsGateway({} as any, {} as any);
    gateway.server = { to, emit } as any;

    const payload = { maintenance: true };
    gateway.broadcastNotificationEvent('notification:system', payload);

    expect(to).not.toHaveBeenCalled();
    expect(emit).toHaveBeenCalledWith('notification:system', payload);
  });
});
