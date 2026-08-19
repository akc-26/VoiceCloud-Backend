import { ConflictException } from '@nestjs/common';
import {
  HostProfile,
  HostVerificationStatus,
} from './entities/host-profile.entity';
import {
  HostStateTransitionAction,
  HostStateTransitionService,
} from './host-state-transition.service';

describe('HostStateTransitionService (VC-PH08-WP06C-B3-3)', () => {
  let service: HostStateTransitionService;

  beforeEach(() => {
    service = new HostStateTransitionService();
  });

  it.each([
    [null, HostVerificationStatus.PENDING, HostStateTransitionAction.APPLY],
    [
      HostVerificationStatus.REJECTED,
      HostVerificationStatus.PENDING,
      HostStateTransitionAction.REAPPLY,
    ],
    [
      HostVerificationStatus.PENDING,
      HostVerificationStatus.APPROVED,
      HostStateTransitionAction.APPROVE,
    ],
    [
      HostVerificationStatus.PENDING,
      HostVerificationStatus.REJECTED,
      HostStateTransitionAction.REJECT,
    ],
    [
      HostVerificationStatus.APPROVED,
      HostVerificationStatus.SUSPENDED,
      HostStateTransitionAction.SUSPEND,
    ],
    [
      HostVerificationStatus.SUSPENDED,
      HostVerificationStatus.APPROVED,
      HostStateTransitionAction.REACTIVATE,
    ],
  ])('allows %s -> %s through %s', (from, to, action) => {
    expect(() => service.assertTransition(from, to, action)).not.toThrow();
  });

  it.each([
    [
      HostVerificationStatus.APPROVED,
      HostVerificationStatus.PENDING,
      HostStateTransitionAction.REAPPLY,
    ],
    [
      HostVerificationStatus.SUSPENDED,
      HostVerificationStatus.PENDING,
      HostStateTransitionAction.REAPPLY,
    ],
    [
      HostVerificationStatus.REJECTED,
      HostVerificationStatus.APPROVED,
      HostStateTransitionAction.APPROVE,
    ],
    [
      HostVerificationStatus.APPROVED,
      HostVerificationStatus.REJECTED,
      HostStateTransitionAction.REJECT,
    ],
    [
      HostVerificationStatus.PENDING,
      HostVerificationStatus.SUSPENDED,
      HostStateTransitionAction.SUSPEND,
    ],
    [
      HostVerificationStatus.APPROVED,
      HostVerificationStatus.APPROVED,
      HostStateTransitionAction.REACTIVATE,
    ],
  ])('rejects invalid %s -> %s through %s', (from, to, action) => {
    expect(() => service.assertTransition(from, to, action)).toThrow(
      ConflictException,
    );
  });

  it('mutates a Host profile only after validating the transition', () => {
    const host = {
      status: HostVerificationStatus.PENDING,
    } as HostProfile;

    const transitioned = service.applyTransition(
      host,
      HostVerificationStatus.APPROVED,
      HostStateTransitionAction.APPROVE,
    );

    expect(transitioned).toBe(host);
    expect(host.status).toBe(HostVerificationStatus.APPROVED);
  });

  it('exposes only the transitions available from the current state', () => {
    const actions = service
      .getAvailableTransitions(HostVerificationStatus.PENDING)
      .map((definition) => definition.action);

    expect(actions).toEqual([
      HostStateTransitionAction.APPROVE,
      HostStateTransitionAction.REJECT,
    ]);
  });
});
