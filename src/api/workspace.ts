/* src/api/workspace.ts — owner 视角的组织/空间设置。 */
import { apiGet, apiPatch } from './client';
import type { WorkspaceDTO, UpdateWorkspaceRequest } from './types';

/** 读当前组织信息(任何成员可读)。 */
export async function getWorkspace(signal?: AbortSignal): Promise<WorkspaceDTO> {
  return apiGet<WorkspaceDTO>('/v1/tenant', signal);
}

/** 改组织名(仅 owner)。成功返回 {status:"ok"}。 */
export async function updateWorkspace(body: UpdateWorkspaceRequest, signal?: AbortSignal): Promise<{ status: string }> {
  return apiPatch<{ status: string }>('/v1/tenant', body, signal);
}
