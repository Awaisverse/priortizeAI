import { randomUUID } from 'crypto';

export function generateId(): string {
  return randomUUID();
}

export function nowISO(): string {
  return new Date().toISOString();
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function executeWithTimeout<T>(
  fn: () => Promise<T>,
  timeoutMs: number,
  moduleName: string,
): Promise<{ output: T; duration: number }> {
  const startTime = Date.now();
  let timeoutHandle: ReturnType<typeof setTimeout> | null = null;

  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutHandle = setTimeout(
      () => reject(new Error(`Timeout in ${moduleName} after ${timeoutMs}ms`)),
      timeoutMs,
    );
  });

  try {
    const result = await Promise.race([fn(), timeoutPromise]);
    return { output: result, duration: Date.now() - startTime };
  } finally {
    if (timeoutHandle !== null) clearTimeout(timeoutHandle);
  }
}

export async function retry<T>(
  fn: () => Promise<T>,
  attempts: number,
  baseDelayMs: number,
): Promise<T> {
  let lastError: Error = new Error('No attempts made');

  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      if (i < attempts - 1) {
        await sleep(baseDelayMs * Math.pow(2, i));
      }
    }
  }

  throw lastError;
}

export function daysFromNow(date: string | Date): number {
  const target = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();
  return Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

export function daysSince(date: string | Date): number {
  return -daysFromNow(date);
}

export function isOverdue(dueDate: string): boolean {
  return new Date(dueDate) < new Date();
}

export function chunkArray<T>(arr: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
}
