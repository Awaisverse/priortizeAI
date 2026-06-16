export function todayDateKey(): string {
  return new Date().toISOString().slice(0, 10);
}

export function dealCacheKey(aeId: string, date: string): string {
  return `deals:${aeId}:${date}`;
}

export function taskCacheKey(aeId: string, date: string): string {
  return `tasks:${aeId}:${date}`;
}

export function contactCacheKey(aeId: string, date: string): string {
  return `contacts:${aeId}:${date}`;
}

export function engagementCacheKey(aeId: string, date: string): string {
  return `engagements:${aeId}:${date}`;
}

export function eventCacheKey(aeId: string, date: string): string {
  return `events:${aeId}:${date}`;
}

export function packageCacheKey(aeId: string, date: string): string {
  return `package:${aeId}:${date}`;
}
