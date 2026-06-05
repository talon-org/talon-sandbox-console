/* src/hooks/useAudit.ts */
import { useQuery } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';
import { listAuditEvents } from '../api/audit';
import { API_BASE } from '../api/client';
import { useApp } from '../store';
import type {
  AuditEventsResponse, AuditQueryParams, AuditStreamEvent,
} from '../api/types';

export const AUDIT_KEY = ['audit'] as const;

export function useAuditEvents(params: AuditQueryParams = {}) {
  return useQuery<AuditEventsResponse>({
    queryKey: [...AUDIT_KEY, params],
    queryFn: ({ signal }) => listAuditEvents(params, signal),
  });
}

interface AuditStreamResult {
  connected: boolean;
  lastEvent: AuditStreamEvent | null;
}

const MAX_BACKOFF_MS = 30_000;
const BASE_BACKOFF_MS = 1_000;

/**
 * Subscribes to the audit SSE stream with automatic exponential-backoff reconnect.
 * @param onEvent - called for each incoming audit event
 * @param tenantId - optional tenant filter (admin only)
 */
export function useAuditStream(
  onEvent: (event: AuditStreamEvent) => void,
  tenantId?: string,
): AuditStreamResult {
  const [connected, setConnected] = useState(false);
  const [lastEvent, setLastEvent] = useState<AuditStreamEvent | null>(null);
  const backoffRef = useRef(BASE_BACKOFF_MS);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mountedRef = useRef(true);
  const onEventRef = useRef(onEvent);
  useEffect(() => { onEventRef.current = onEvent; });

  useEffect(() => {
    mountedRef.current = true;
    let es: EventSource;

    function openConnection() {
      const token = useApp.getState().authToken;
      const params = new URLSearchParams();
      if (tenantId) params.set('tenant_id', tenantId);
      // 后端只认 ?access_token=(OAuth2 RFC 6750,与 PTY 一致);用 token= 会 403。
      if (token) params.set('access_token', token);
      const paramStr = params.toString();
      const url = `${API_BASE}/v1/audit/events/stream${paramStr ? `?${paramStr}` : ''}`;
      es = new EventSource(url, { withCredentials: true });

      es.onopen = () => {
        if (!mountedRef.current) return;
        backoffRef.current = BASE_BACKOFF_MS;
        setConnected(true);
      };

      es.onerror = () => {
        es.close();
        if (!mountedRef.current) return;
        setConnected(false);
        const delay = Math.min(backoffRef.current, MAX_BACKOFF_MS);
        backoffRef.current = Math.min(backoffRef.current * 2, MAX_BACKOFF_MS);
        timerRef.current = setTimeout(() => {
          if (mountedRef.current) openConnection();
        }, delay);
      };

      es.addEventListener('audit', (e: MessageEvent) => {
        if (!mountedRef.current) return;
        try {
          const data = JSON.parse(e.data as string) as AuditStreamEvent;
          setLastEvent(data);
          onEventRef.current(data);
        } catch {
          // ignore malformed events
        }
      });
    }

    openConnection();

    return () => {
      mountedRef.current = false;
      if (es) es.close();
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  // Intentionally only re-run on tenantId change; onEvent is stable via ref
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenantId]);

  return { connected, lastEvent };
}
