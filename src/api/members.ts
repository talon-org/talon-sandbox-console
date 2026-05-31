/* src/api/members.ts — 自助团队成员 / 邀请管理，纯 HTTP，无 React
 * 风格对齐 src/api/apiKeys.ts / secrets.ts：apiGet / apiPost / apiPatch / apiDelete
 *
 * 端点都带 tenant_id（从当前用户 me.tenant_id 取，调用方传入）：
 *   GET    /v1/tenants/{tid}/members
 *   PATCH  /v1/tenants/{tid}/members/{uid}        body { role }   (owner)
 *   DELETE /v1/tenants/{tid}/members/{uid}                        (owner)
 *   GET    /v1/tenants/{tid}/invitations                          (owner)
 *   POST   /v1/tenants/{tid}/invitations          body { email, role } (owner)
 *   DELETE /v1/tenants/{tid}/invitations/{iid}                    (owner)
 *   POST   /v1/invitations/accept                 body { token, name? } (公开)
 */
import { apiGet, apiPost, apiPatch, apiDelete } from './client';
import type {
  MemberListResponse, MemberDTO, UpdateMemberRoleRequest,
  InvitationListResponse, InvitationDTO, CreateInvitationRequest,
  AcceptInvitationRequest, AcceptInvitationResponse,
} from './types';

/** GET 成员列表（developer+ 可读） */
export async function listMembers(
  tenantId: string,
  signal?: AbortSignal,
): Promise<MemberListResponse> {
  return apiGet<MemberListResponse>(`/v1/tenants/${tenantId}/members`, signal);
}

/** PATCH 改成员角色（owner，后端 403 兜底） */
export async function updateMemberRole(
  tenantId: string,
  userId: string,
  req: UpdateMemberRoleRequest,
  signal?: AbortSignal,
): Promise<MemberDTO> {
  return apiPatch<MemberDTO>(`/v1/tenants/${tenantId}/members/${userId}`, req, signal);
}

/** DELETE 移除成员（owner） */
export async function removeMember(
  tenantId: string,
  userId: string,
  signal?: AbortSignal,
): Promise<void> {
  return apiDelete(`/v1/tenants/${tenantId}/members/${userId}`, signal);
}

/** GET 待处理邀请列表（owner） */
export async function listInvitations(
  tenantId: string,
  signal?: AbortSignal,
): Promise<InvitationListResponse> {
  return apiGet<InvitationListResponse>(`/v1/tenants/${tenantId}/invitations`, signal);
}

/** POST 创建邀请（owner）。响应可能带 accept_url（后端未配邮件时），需前端展示。 */
export async function createInvitation(
  tenantId: string,
  req: CreateInvitationRequest,
  signal?: AbortSignal,
): Promise<InvitationDTO> {
  return apiPost<InvitationDTO>(`/v1/tenants/${tenantId}/invitations`, req, signal);
}

/** DELETE 撤销邀请（owner） */
export async function revokeInvitation(
  tenantId: string,
  inviteId: string,
  signal?: AbortSignal,
): Promise<void> {
  return apiDelete(`/v1/tenants/${tenantId}/invitations/${inviteId}`, signal);
}

/** POST 接受邀请（公开端点，无需登录） */
export async function acceptInvitation(
  req: AcceptInvitationRequest,
  signal?: AbortSignal,
): Promise<AcceptInvitationResponse> {
  return apiPost<AcceptInvitationResponse>('/v1/invitations/accept', req, signal);
}
