import { AsyncLocalStorage } from 'async_hooks';
import { randomUUID } from 'crypto';

export interface RequestContextStore {
  requestId: string;
  service?: string;
}

const storage = new AsyncLocalStorage<RequestContextStore>();

export const runWithRequestContext = <T>(
  context: RequestContextStore,
  fn: () => T
): T => storage.run(context, fn);

export const getRequestContext = (): RequestContextStore | undefined =>
  storage.getStore();

export const getRequestId = (): string =>
  storage.getStore()?.requestId || randomUUID();
