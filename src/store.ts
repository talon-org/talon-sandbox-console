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
    set({ authToken: token, me, tenantId: me?.tenant_id ?? null });
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
