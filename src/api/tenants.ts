/* src/api/tenants.ts — pure HTTP functions, no React
 * API path: /v1/admin/tenants (backend convention)
 * UI label: "Workspaces" (SPEC-pages.md naming convention)
 */
import { apiGet, apiPost, apiDelete } from './client';
import type {
  TenantListResponse, TenantDetailDTO,
  CreateTenantRequest,
} from './types';

/** 超管直接给工作区添加成员(建用户+active membership,无需邀请确认)。
 *  POST /v1/admin/tenants/{tenant_id}/members  body { email, role } */
export async function adminAddTenantMember(
  tenantId: string,
  body: { email: string; role: string },
  signal?: AbortSignal,
): Promise<void> {
  return apiPost<void>(`/v1/admin/tenants/${tenantId}/members`, body, signal);
}

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
