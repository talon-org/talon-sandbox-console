/* src/hooks/useTenants.ts */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  listTenants, getTenantDetail, createTenant, suspendTenant,
} from '../api/tenants';
import type {
  TenantListResponse, TenantDetailDTO, CreateTenantRequest,
} from '../api/types';

export const TENANTS_KEY = ['tenants'] as const;

export function useTenants() {
  return useQuery<TenantListResponse>({
    queryKey: TENANTS_KEY,
    queryFn: ({ signal }) => listTenants(signal),
  });
}

export function useTenantDetail(id: string) {
  return useQuery<TenantDetailDTO>({
    queryKey: ['tenants', id],
    queryFn: ({ signal }) => getTenantDetail(id, signal),
    enabled: id.length > 0,
  });
}

export function useCreateTenant() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (req: CreateTenantRequest) => createTenant(req),
    onSuccess: () => qc.invalidateQueries({ queryKey: TENANTS_KEY }),
  });
}

export function useSuspendTenant() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => suspendTenant(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: TENANTS_KEY }),
  });
}
