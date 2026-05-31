import { create } from 'zustand';

export type ThemeKey =
  | 'ink'
  | 'onyx'
  | 'pewter'
  | 'iron'
  | 'phosphor'
  | 'indigo'
  | 'violet'
  | 'sky'
  | 'teal';
export type ModeKey = 'dark' | 'light';
export type DensityKey = 'compact' | 'standard' | 'relaxed';
export type FontKey = 'geist' | 'plex' | 'jetbrains' | 'system';
export type LangKey = 'en' | 'zh';

export interface Me {
  id: string;
  email: string;
  name: string;
  role: string;
  tenant_id: string;
  /** 用户偏好原始 JSON 串 {"lang":..,"theme":..}（后端 users.prefs）。空 = 未设置。
   *  登录/hydrate 时据此把 lang/mode 同步到本地,实现跨设备偏好。 */
  prefs?: string;
  /** 细粒度权限集预留(RBAC membership spec §6)。本期三档角色够用,权威源已收口到
   *  membership;未来加 role→permission 细粒度时后端回填此字段,前端 permissions.ts
   *  的判定可平滑切到它,不必翻地基。后端当前不返回 → undefined。 */
  permissions?: string[];
}

interface AppState {
  authToken: string | null;
  me: Me | null;
  tenantId: string | null;
  cmdkOpen: boolean;

  theme: ThemeKey;
  mode: ModeKey;
  density: DensityKey;
  font: FontKey;
  lang: LangKey;

  setAuth: (token: string | null, me: Me | null) => void;
  logout: () => void;
  setTweak: (key: 'theme' | 'mode' | 'density' | 'font' | 'lang', value: string) => void;
  setCmdK: (open: boolean) => void;
}

const LS = {
  theme: 'tln:v2:theme',
  mode: 'tln:v2:mode',
  density: 'tln:v2:density',
  font: 'tln:v2:font',
  lang: 'tln:v2:lang',
  token: 'tln:v2:token',
} as const;

function read<T extends string>(key: string, fallback: T): T {
  try {
    return (localStorage.getItem(key) as T | null) ?? fallback;
  } catch {
    return fallback;
  }
}

const initialTheme = read<ThemeKey>(LS.theme, 'ink');
const initialMode = read<ModeKey>(LS.mode, 'dark');
const initialDensity = read<DensityKey>(LS.density, 'standard');
const initialFont = read<FontKey>(LS.font, 'geist');
const initialLang = read<LangKey>(LS.lang, 'zh');

// Apply cascading data-* on <html> before paint so styles match state from the start.
function applyAttrs() {
  const r = document.documentElement;
  r.setAttribute('data-theme', initialTheme);
  r.setAttribute('data-mode', initialMode);
  r.setAttribute('data-density', initialDensity);
  r.setAttribute('data-font', initialFont);
  r.setAttribute('data-lang', initialLang);
}
applyAttrs();

// applyServerPrefs 解析服务端 prefs JSON,把 lang/mode 写入 localStorage + <html>,
// 返回要 merge 进 store 的局部 state。容错:非法 JSON / 未知值静默忽略。
// 注:服务端偏好里的 theme 是「明/暗」语义(light/dark/system),映射到 console 的
// mode(dark|light);console 的 theme(调色板)不在服务端偏好范围内,保持本地。
function applyServerPrefs(raw: string): Partial<Pick<AppState, 'lang' | 'mode'>> {
  const out: Partial<Pick<AppState, 'lang' | 'mode'>> = {};
  let p: { lang?: string; theme?: string };
  try {
    p = JSON.parse(raw);
  } catch {
    return out;
  }
  const setAttr = (k: string, v: string, lsKey: string) => {
    try { localStorage.setItem(lsKey, v); } catch { /* ignore */ }
    document.documentElement.setAttribute(`data-${k}`, v);
  };
  if (p.lang === 'en' || p.lang === 'zh') {
    out.lang = p.lang;
    setAttr('lang', p.lang, LS.lang);
  }
  // system 视为「不强制」,交给本地默认(dark);只有显式 light/dark 才落。
  if (p.theme === 'light' || p.theme === 'dark') {
    out.mode = p.theme;
    setAttr('mode', p.theme, LS.mode);
  }
  return out;
}

export const useApp = create<AppState>((set) => ({
  authToken: read<string>(LS.token, '') || null,
  me: null,
  tenantId: null,
  cmdkOpen: false,

  theme: initialTheme,
  mode: initialMode,
  density: initialDensity,
  font: initialFont,
  lang: initialLang,

  setAuth: (token, me) => {
    try {
      if (token) localStorage.setItem(LS.token, token);
      else localStorage.removeItem(LS.token);
    } catch {
      /* ignore */
    }
    // 把服务端偏好(lang/theme)同步到本地 + <html> data-attrs,实现跨设备偏好。
    // 本地已有显式选择时不覆盖(用户在本机刚改过,以本机为准);仅当 prefs 提供
    // 且本地缺失时套用。这样换设备登录能继承,本机微调又不被服务端旧值打回。
    const applied = me?.prefs ? applyServerPrefs(me.prefs) : {};
    set({ authToken: token, me, tenantId: me?.tenant_id ?? null, ...applied });
  },

  logout: () => {
    try {
      localStorage.removeItem(LS.token);
    } catch {
      /* ignore */
    }
    set({ authToken: null, me: null, tenantId: null });
  },

  setTweak: (key, value) => {
    const lsKey = (LS as Record<string, string>)[key];
    try {
      localStorage.setItem(lsKey, value);
    } catch {
      /* ignore */
    }
    document.documentElement.setAttribute(`data-${key}`, value);
    set({ [key]: value } as Pick<AppState, 'theme' | 'mode' | 'density' | 'font' | 'lang'>);
  },

  setCmdK: (open) => set({ cmdkOpen: open }),
}));

// 超管租户 id —— 与后端 internal/auth/jwt.go 的 AdminTenantID 对齐。
// tenant_id === '__admin' 的用户能看运维菜单(Workers / Tenants)。
export const ADMIN_TENANT_ID = '__admin';

/** 当前登录用户是否为超管(运维)。admin 判据收口到这里,各处统一调用。 */
export function useIsAdmin(): boolean {
  return useApp((s) => s.me?.tenant_id === ADMIN_TENANT_ID);
}

/** API Key 登录会话:token 以 ask_ 前缀。
 *  后端对 API Key 路径把角色固定为「成员」(机器凭据故意限权,防泄露能管成员/计费),
 *  与登录用户的真实角色无关。前端据此给「Key 登录权限受限」标识,避免管理员误以为
 *  自己没权限。判据收口到这里,各处统一调用。 */
export function useIsApiKeySession(): boolean {
  return useApp((s) => !!s.authToken && s.authToken.startsWith('ask_'));
}
