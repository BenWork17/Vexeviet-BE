import { config } from '@vexeviet/config';
import { INTERNAL_API_KEY_HEADER, REQUEST_ID_HEADER } from '../constants';
import { getRequestId } from '../context/request-context';

export interface InternalFetchOptions extends RequestInit {
  includeInternalKey?: boolean;
}

/**
 * Service-to-service HTTP wrapper that automatically propagates `X-Request-Id`
 * and optionally attaches `x-internal-api-key`.
 */
export async function internalFetch(
  url: string,
  options: InternalFetchOptions = {}
): Promise<Response> {
  const { includeInternalKey = true, headers: customHeaders, ...rest } = options;
  const headers = new Headers(customHeaders);

  if (!headers.has('Content-Type') && rest.body !== undefined) {
    headers.set('Content-Type', 'application/json');
  }

  headers.set(REQUEST_ID_HEADER, getRequestId());

  const internalKey = process.env.BOOKING_SERVICE_INTERNAL_API_KEY || config.services.internalApiKey;
  if (includeInternalKey && internalKey && !headers.has(INTERNAL_API_KEY_HEADER)) {
    headers.set(INTERNAL_API_KEY_HEADER, internalKey);
  }

  return fetch(url, {
    ...rest,
    headers,
  });
}
