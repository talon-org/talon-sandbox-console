/* src/api/tenants.ts — pure HTTP functions, no React
 * API path: /v1/admin/tenants (backend convention)
 * UI label: "Workspaces" (SPEC-pages.md naming convention)
 */
import { apiGet, apiPost, apiDelete } from './client';
import type {
  TenantListResponse, TenantDetailDTO,
  CreateTenantRequest,
} from './types';

export async function listTenants(signal?: AbortSignal): Promise<TenantListResponse> {
  return apiGet<TenantListResponse>('/v1/admin/tenants', signal);
}

export async function getTenantDetail(
  id: string,
  signal?: AbortSignal,
): Promise<TenantDetailDTO> {
  return apiGet<TenantDetailDTO>(`/v1/admin/tenants/${id}`, signal);
}

export async function createTenant(
  req: CreateTenantRequest,
  signal?: AbortSignal,
): Promise<TenantDetailDTO> {
  return apiPost<TenantDetailDTO>('/v1/admin/tenants', req, signal);
}

/** DELETE /v1/admin/tenants/{id} semantically SUSPENDS (not hard-delete) */
export async function suspendTenant(id: string, signal?: AbortSignal): Promise<void> {
  return apiDelete(`/v1/admin/tenants/${id}`, signal);
}
