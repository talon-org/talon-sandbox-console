/* ThemeToggle — 暗/亮主题切换按钮。
 * 复用底层已有的主题机制:store.setTweak('mode', ...) 负责持久化 (localStorage)
 * 与应用 (<html data-mode>),本组件只是它的可视入口。登录页和顶栏共用同一组件,
 * 避免两处各自实现。不自带定位/尺寸,样式由调用方通过 className 注入
 * (顶栏复用 .ic-btn,登录页用 .login-theme-toggle 容器)。
 */
import { useApp } from '../store';
import { useT } from '../i18n/useT';
import { TlnIcon } from '../icons/TlnIcon';

interface ThemeToggleProps {
  className?: string;
  size?: number;
}

export function ThemeToggle({ className, size = 15 }: ThemeToggleProps) {
  const t       = useT();
  const mode    = useApp((s) => s.mode);
  const setTweak = useApp((s) => s.setTweak);

  const isDark = mode === 'dark';
  // 当前暗色 → 显示太阳(点击转亮);当前亮色 → 显示月亮(点击转暗)。
  const next  = isDark ? 'light' : 'dark';
  const label = isDark ? t('theme.toggle.toLight') : t('theme.toggle.toDark');

  return (
    <button
      type="button"
      className={className}
      title={label}
      aria-label={label}
      onClick={() => setTweak('mode', next)}
    >
      <TlnIcon name={isDark ? 'sun' : 'moon'} size={size} />
    </button>
  );
}
