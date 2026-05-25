/* src/hooks/useRecordings.ts */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { listRecordings, startRecording, stopRecording } from '../api/recordings';
import type { RecordingPageResponse, RecordingQueryParams } from '../api/types';

export const RECORDINGS_KEY = ['recordings'] as const;

export function useRecordings(opts: RecordingQueryParams = {}) {
  return useQuery<RecordingPageResponse>({
    queryKey: [...RECORDINGS_KEY, opts],
    queryFn: ({ signal }) => listRecordings(opts, signal),
  });
}

export function useStartRecording() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      sandboxId,
      title,
      agent,
    }: {
      sandboxId: string;
      title?: string;
      agent?: string;
    }) => startRecording(sandboxId, { title, agent }),
    onSuccess: () => qc.invalidateQueries({ queryKey: RECORDINGS_KEY }),
  });
}

export function useStopRecording() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (sandboxId: string) => stopRecording(sandboxId),
    onSuccess: () => qc.invalidateQueries({ queryKey: RECORDINGS_KEY }),
  });
}
