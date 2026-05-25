/* src/api/audit.ts — pure HTTP functions + SSE helper, no React */
import { apiGet, API_BASE } from './client';
import { useApp } from '../store';
import type { AuditEventsResponse, AuditQueryParams, AuditStreamEvent } from './types';

function buildAuditParams(q: AuditQueryParams): string {
  const p = new URLSearchParams();
  if (q.event_type) p.set('event_type', q.event_type);
  if (q.outcome) p.set('outcome', q.outcome);
  if (q.target) p.set('target', q.target);
  if (q.since !== undefined) p.set('since', String(q.since));
  if (q.until !== undefined) p.set('until', String(q.until));
  if (q.limit !== undefined) p.set('limit', String(q.limit));
  const s = p.toString();
  return s ? `?${s}` : '';
}

export async function listAuditEvents(
  params: AuditQueryParams = {},
  signal?: AbortSignal,
): Promise<AuditEventsResponse> {
  return apiGet<AuditEventsResponse>(`/v1/audit/events${buildAuditParams(params)}`, signal);
}

export type AuditStreamEventCallback = (event: AuditStreamEvent) => void;

/**
 * Opens an EventSource to /v1/audit/events/stream.
 * Returns a cleanup function that closes the connection.
 * Caller owns reconnect logic; use useAuditStream hook for managed connection.
 */
export function openAuditStream(
  onEvent: AuditStreamEventCallback,
  tenantId?: string,
): () => void {
  const token = useApp.getState().authToken;
  const params = new URLSearchParams();
  if (tenantId) params.set('tenant_id', tenantId);
  if (token) params.set('token', token);
  const paramStr = params.toString();
  const url = `${API_BASE}/v1/audit/events/stream${paramStr ? `?${paramStr}` : ''}`;

  const es = new EventSource(url, { withCredentials: true });

  es.addEventListener('audit', (e: MessageEvent) => {
    try {
      const data = JSON.parse(e.data as string) as AuditStreamEvent;
      onEvent(data);
    } catch {
      // Malformed event — ignore
    }
  });

  return () => es.close();
}
