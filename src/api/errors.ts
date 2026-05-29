/* 登录错误 → 友好文案 key 映射。
 * 把后端原始报文 (如 API 401: {"error":"unauthorized"}) 收敛成有限的用户可读场景,
 * 返回 i18n key (而非文案本身,保持 i18n 单一来源)。
 *
 * 401 在两条登录路径含义不同,按当前 tab 区分,不解析后端 error 字段
 * —— 简单可靠,不依赖后端报文格式稳定。
 */
import { ApiError } from './client';

export type LoginCtx = 'email' | 'apikey';

export function loginErrorKey(err: unknown, ctx: LoginCtx): string {
  if (err instanceof ApiError) {
    const s = err.status;
    if (s === 429) return 'login.err.rateLimited';
    if (s >= 500)  return 'login.err.server';
    if (s === 401 || s === 400 || s === 403) {
      return ctx === 'apikey' ? 'login.err.invalidKey' : 'login.err.invalidCode';
    }
    return 'login.err.generic';
  }
  // fetch 在网络层失败 (断网 / DNS / CORS) 抛 TypeError,不是 ApiError。
  if (err instanceof TypeError) return 'login.err.network';
  return 'login.err.generic';
}
