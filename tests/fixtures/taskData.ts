import type { Task } from '../../src/models';
import { makeTask } from '../../src/utils/mockDataGenerator';

function daysFromNowISO(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString();
}

export const testTasks: Task[] = [
  makeTask({
    title: 'Send revised proposal',
    priority: 'P1',
    status: 'pending',
    dueDate: daysFromNowISO(1),
  }),
  makeTask({
    title: 'Schedule follow-up call',
    priority: 'P2',
    status: 'pending',
    dueDate: daysFromNowISO(3),
  }),
  makeTask({
    title: 'Overdue: Sent pricing doc',
    priority: 'P1',
    status: 'overdue',
    isOverdue: true,
    daysOverdue: 3,
    dueDate: daysFromNowISO(-3),
  }),
  makeTask({
    title: 'Completed: Initial call',
    priority: 'P3',
    status: 'completed',
    completedAt: daysFromNowISO(-7),
    dueDate: daysFromNowISO(-8),
  }),
];

export const overdueTask = makeTask({
  title: 'Overdue Critical Task',
  priority: 'P1',
  status: 'overdue',
  isOverdue: true,
  daysOverdue: 5,
  dueDate: daysFromNowISO(-5),
});

export const urgentTask = makeTask({
  title: 'Urgent: Closing call prep',
  priority: 'P0',
  status: 'pending',
  dueDate: daysFromNowISO(0),
});

export const lowPriorityTask = makeTask({
  title: 'Update CRM notes',
  priority: 'P3',
  status: 'pending',
  dueDate: daysFromNowISO(14),
});
