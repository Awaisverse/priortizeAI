import type { Deal } from '../../src/models';
import { makeDeal } from '../../src/utils/mockDataGenerator';

function daysFromNowISO(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString();
}

export const testDeals: Deal[] = [
  makeDeal({
    name: 'Acme Corp Enterprise',
    amount: 100_000,
    status: 'open',
    stage: 'proposal',
    closingRisk: 'high',
    closeDate: daysFromNowISO(5),
  }),
  makeDeal({
    name: 'TechStartup Deal',
    amount: 25_000,
    status: 'open',
    stage: 'discovery',
    closingRisk: 'low',
    closeDate: daysFromNowISO(30),
  }),
  makeDeal({
    name: 'BigCo Renewal',
    amount: 50_000,
    status: 'stalled',
    stage: 'proposal',
    closeDate: daysFromNowISO(20),
  }),
  makeDeal({
    name: 'SmallBiz Pilot',
    amount: 5_000,
    status: 'open',
    stage: 'demo',
    closingRisk: 'low',
    closeDate: daysFromNowISO(45),
  }),
];

export const highRiskDeal = makeDeal({
  name: 'High Risk Closing Deal',
  amount: 200_000,
  closingRisk: 'high',
  closeDate: daysFromNowISO(3),
  status: 'open',
  stage: 'closingcall',
});

export const stalledDeal = makeDeal({
  name: 'Stalled Enterprise Deal',
  amount: 75_000,
  status: 'stalled',
  lastActivity: daysFromNowISO(-20),
  closeDate: daysFromNowISO(14),
});

export const lowValueDeal = makeDeal({
  name: 'Small Deal',
  amount: 1_000,
  status: 'open',
  closeDate: daysFromNowISO(60),
});

export const zeroDollarDeal = makeDeal({
  name: 'No Amount Deal',
  amount: 0,
  status: 'open',
  closeDate: daysFromNowISO(30),
});
