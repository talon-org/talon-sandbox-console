/* src/hooks/useSecrets.ts */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { listSecrets, createSecret, rotateSecret } from '../api/secrets';
import type { CreateSecretRequest, RotateSecretRequest, SecretListResponse } from '../api/types';

export const SECRETS_KEY = ['secrets'] as const;

export function useSecrets() {
  return useQuery<SecretListResponse>({
    queryKey: SECRETS_KEY,
    queryFn: ({ signal }) => listSecrets(signal),
  });
}

export function useCreateSecret() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (req: CreateSecretRequest) => createSecret(req),
    onSuccess: () => qc.invalidateQueries({ queryKey: SECRETS_KEY }),
  });
}

export function useRotateSecret() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, req }: { id: string; req?: RotateSecretRequest }) =>
      rotateSecret(id, req),
    onSuccess: () => qc.invalidateQueries({ queryKey: SECRETS_KEY }),
  });
}
