/* src/i18n/strings/index.ts
 * Merges all namespace dictionaries into the flat STRINGS record
 * consumed by useT() in src/i18n/useT.ts.
 * Import individual namespaces for tree-shaking in tests:
 *   import { dashboard } from '../i18n/strings/dashboard';
 */
import { shell }      from './shell';
import { common }     from './common';
import { tweaks }     from './tweaks';
import { cmdk }       from './cmdk';
import { dashboard }  from './dashboard';
import { sandboxes }  from './sandboxes';
import { login }      from './login';
import { secrets }    from './secrets';
import { audit }      from './audit';
import { workers }    from './workers';
import { tenants }    from './tenants';
import { recordings } from './recordings';
import { terminal }   from './terminal';
import { apiKeys }    from './apiKeys';
import { plans }      from './plans';
import { members }    from './members';
import { billing }    from './billing';
import { settings }   from './settings';
import { sysconf }    from './sysconf';
import { images }     from './images';

export type LangKey = 'en' | 'zh';

export const STRINGS: Record<string, { en: string; zh: string }> = {
  ...shell,
  ...common,
  ...tweaks,
  ...cmdk,
  ...dashboard,
  ...sandboxes,
  ...login,
  ...secrets,
  ...audit,
  ...workers,
  ...tenants,
  ...recordings,
  ...terminal,
  ...apiKeys,
  ...plans,
  ...members,
  ...billing,
  ...settings,
  ...sysconf,
  ...images,
};

export {
  shell, common, tweaks, cmdk, dashboard, sandboxes,
  login, secrets, audit, workers, tenants, recordings, terminal,
  apiKeys, plans, members, billing, settings, sysconf, images,
};
