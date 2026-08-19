import { ConflictException, Injectable } from '@nestjs/common';
import {
  HostProfile,
  HostVerificationStatus,
} from './entities/host-profile.entity';

export enum HostStateTransitionAction {
  APPLY = 'APPLY',
  REAPPLY = 'REAPPLY',
  APPROVE = 'APPROVE',
  REJECT = 'REJECT',
  SUSPEND = 'SUSPEND',
  REACTIVATE = 'REACTIVATE',
}

export interface HostStateTransitionDefinition {
  from: HostVerificationStatus | null;
  to: HostVerificationStatus;
  action: HostStateTransitionAction;
}

const HOST_STATE_TRANSITIONS: readonly HostStateTransitionDefinition[] = [
  {
    from: null,
    to: HostVerificationStatus.PENDING,
    action: HostStateTransitionAction.APPLY,
  },
  {
    from: HostVerificationStatus.REJECTED,
    to: HostVerificationStatus.PENDING,
    action: HostStateTransitionAction.REAPPLY,
  },
  {
    from: HostVerificationStatus.PENDING,
    to: HostVerificationStatus.APPROVED,
    action: HostStateTransitionAction.APPROVE,
  },
  {
    from: HostVerificationStatus.PENDING,
    to: HostVerificationStatus.REJECTED,
    action: HostStateTransitionAction.REJECT,
  },
  {
    from: HostVerificationStatus.APPROVED,
    to: HostVerificationStatus.SUSPENDED,
    action: HostStateTransitionAction.SUSPEND,
  },
  {
    from: HostVerificationStatus.SUSPENDED,
    to: HostVerificationStatus.APPROVED,
    action: HostStateTransitionAction.REACTIVATE,
  },
] as const;

@Injectable()
export class HostStateTransitionService {
  getDefinitions(): readonly HostStateTransitionDefinition[] {
    return HOST_STATE_TRANSITIONS;
  }

  getAvailableTransitions(
    currentStatus: HostVerificationStatus | null,
  ): readonly HostStateTransitionDefinition[] {
    return HOST_STATE_TRANSITIONS.filter(
      (definition) => definition.from === currentStatus,
    );
  }

  assertTransition(
    currentStatus: HostVerificationStatus | null,
    targetStatus: HostVerificationStatus,
    action: HostStateTransitionAction,
  ): void {
    const allowed = HOST_STATE_TRANSITIONS.some(
      (definition) =>
        definition.from === currentStatus &&
        definition.to === targetStatus &&
        definition.action === action,
    );

    if (!allowed) {
      const from = currentStatus ?? 'NONE';
      throw new ConflictException(
        `Invalid Host state transition: ${from} -> ${targetStatus} (${action})`,
      );
    }
  }

  applyTransition(
    host: HostProfile,
    targetStatus: HostVerificationStatus,
    action: HostStateTransitionAction,
  ): HostProfile {
    this.assertTransition(host.status, targetStatus, action);
    host.status = targetStatus;
    return host;
  }
}
