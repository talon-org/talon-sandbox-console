/* src/api/recordings.ts — pure HTTP functions, no React */
import { apiGet, apiPost } from './client';
import type {
  RecordingPageResponse, StartRecordingResponse,
  StopRecordingResponse, RecordingQueryParams,
} from './types';

function buildRecordingParams(opts: RecordingQueryParams): string {
  const p = new URLSearchParams();
  if (opts.tenant_id) p.set('tenant_id', opts.tenant_id);
  if (opts.sandbox_id) p.set('sandbox_id', opts.sandbox_id);
  if (opts.agent) p.set('agent', opts.agent);
  if (opts.since) p.set('since', opts.since);
  if (opts.limit !== undefined) p.set('limit', String(opts.limit));
  if (opts.cursor) p.set('cursor', opts.cursor);
  const s = p.toString();
  return s ? `?${s}` : '';
}

export async function listRecordings(
  opts: RecordingQueryParams = {},
  signal?: AbortSignal,
): Promise<RecordingPageResponse> {
  return apiGet<RecordingPageResponse>(`/v1/recordings${buildRecordingParams(opts)}`, signal);
}

export async function startRecording(
  sandboxId: string,
  opts?: { title?: string; agent?: string },
  signal?: AbortSignal,
): Promise<StartRecordingResponse> {
  return apiPost<StartRecordingResponse>(
    `/v1/sandboxes/${sandboxId}/recordings/start`,
    opts ?? {},
    signal,
  );
}

export async function stopRecording(
  sandboxId: string,
  signal?: AbortSignal,
): Promise<StopRecordingResponse> {
  return apiPost<StopRecordingResponse>(
    `/v1/sandboxes/${sandboxId}/recordings/stop`,
    {},
    signal,
  );
}
