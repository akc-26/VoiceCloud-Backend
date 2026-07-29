import { CreatorPlan } from './entities/creator-plan.entity';
import { CreatorSubscription } from './entities/creator-subscription.entity';
import { CreatorPayoutRequest } from './entities/creator-payout-request.entity';
import {
  CreatorPlanStatus,
  SubscriptionStatus,
  PayoutStatus,
  PayoutMethod,
  VisibilityType,
} from '../../common/enums';

describe('Phase 1C Creator Economy Foundation Entities', () => {
  it('should instantiate CreatorPlan entity correctly', () => {
    const plan = new CreatorPlan();
    plan.id = '123e4567-e89b-12d3-a456-426614174200';
    plan.creatorId = '123e4567-e89b-12d3-a456-426614174002';
    plan.title = 'VIP Backstage Pass';
    plan.description = 'Exclusive access to VIP voice rooms';
    plan.monthlyPrice = 9.99;
    plan.yearlyPrice = 99.99;
    plan.benefits = ['Exclusive Badge', 'VIP Room Access'];
    plan.visibility = VisibilityType.PUBLIC;
    plan.status = CreatorPlanStatus.ACTIVE;

    expect(plan.title).toBe('VIP Backstage Pass');
    expect(plan.monthlyPrice).toBe(9.99);
    expect(plan.yearlyPrice).toBe(99.99);
    expect(plan.benefits.length).toBe(2);
    expect(plan.status).toBe(CreatorPlanStatus.ACTIVE);
  });

  it('should instantiate CreatorSubscription entity correctly', () => {
    const sub = new CreatorSubscription();
    sub.id = '123e4567-e89b-12d3-a456-426614174201';
    sub.subscriberId = '123e4567-e89b-12d3-a456-426614174003';
    sub.creatorId = '123e4567-e89b-12d3-a456-426614174002';
    sub.planId = '123e4567-e89b-12d3-a456-426614174200';
    sub.status = SubscriptionStatus.ACTIVE;
    sub.autoRenew = true;

    expect(sub.subscriberId).toBe('123e4567-e89b-12d3-a456-426614174003');
    expect(sub.status).toBe(SubscriptionStatus.ACTIVE);
    expect(sub.autoRenew).toBe(true);
  });

  it('should instantiate CreatorPayoutRequest entity correctly', () => {
    const req = new CreatorPayoutRequest();
    req.id = '123e4567-e89b-12d3-a456-426614174202';
    req.creatorId = '123e4567-e89b-12d3-a456-426614174002';
    req.diamondAmount = 10000;
    req.payoutAmount = 50.0;
    req.payoutMethod = PayoutMethod.BANK_TRANSFER;
    req.accountDetails = { accountNumber: '****1234', bankName: 'Chase' };
    req.status = PayoutStatus.PENDING;

    expect(req.diamondAmount).toBe(10000);
    expect(req.payoutAmount).toBe(50.0);
    expect(req.payoutMethod).toBe(PayoutMethod.BANK_TRANSFER);
    expect(req.status).toBe(PayoutStatus.PENDING);
  });
});
