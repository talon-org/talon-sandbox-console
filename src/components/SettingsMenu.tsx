/* SettingsMenu — 顶栏「设置」图标 + Popover 弹出的外观/语言面板。
 * 取代原 dev-only 右下角浮动 TweaksPanel:同样的设置项(主题色 / 明暗 /
 * 语言 / 密度 / 字体),但收进顶栏一个图标,作为正式功能对所有用户开放。
 * 底层仍复用 store.setTweak(...) —— 持久化 (localStorage) 与应用 (<html data-*>)
 * 都由 store 负责,本组件只是它的可视入口。
 */
import {
  Popover, PopoverTrigger, PopoverContent,
  SegmentedGroup, SegmentedItem,
} from '@talon-sandbox/react';
import { TlnIcon } from '../icons/TlnIcon';
import { useApp } from '../store';
import { useT } from '../i18n/useT';
import type { ThemeKey, ModeKey, DensityKey, FontKey, LangKey } from '../store';

import './SettingsMenu.css';

// 主题色卡 —— 与 design-source 原型一致
const THEME_SWATCHES: { id: ThemeKey; bg: string; label: string }[] = [
  { id: 'ink',      bg: '#7d97ff', label: 'Ink' },
  { id: 'onyx',     bg: '#e6cf4a', label: 'Onyx' },
  { id: 'pewter',   bg: '#b8d6f0', label: 'Pewter' },
  { id: 'iron',     bg: '#e85d4a', label: 'Iron' },
  { id: 'phosphor', bg: '#b6e63e', label: 'Phosphor' },
  { id: 'indigo',   bg: '#8194f0', label: 'Indigo' },
  { id: 'violet',   bg: '#b298f0', label: 'Violet' },
  { id: 'sky',      bg: '#5cb6ee', label: 'Sky' },
  { id: 'teal',     bg: '#56cbb8', label: 'Teal' },
];

export function SettingsMenu() {
  const t        = useT();
  const theme    = useApp(s => s.theme);
  const mode     = useApp(s => s.mode);
  const density  = useApp(s => s.density);
  const font     = useApp(s => s.font);
  const lang     = useApp(s => s.lang);
  const setTweak = useApp(s => s.setTweak);

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="ic-btn"
          title={t('settings.title')}
          aria-label={t('settings.title')}
        >
          <TlnIcon name="settings" size={15} />
        </button>
      </PopoverTrigger>

      <PopoverContent align="end" sideOffset={8} className="settings-menu">
        <div className="settings-menu__title">{t('settings.title')}</div>

        {/* 主题色 */}
        <div className="settings-menu__row">
          <span className="settings-menu__key">{t('tweaks.theme')}</span>
          <div className="settings-menu__swatches">
            {THEME_SWATCHES.map(sw => (
              <button
                key={sw.id}
                type="button"
                className="settings-menu__swatch"
                style={{ background: sw.bg }}
                aria-pressed={theme === sw.id}
                aria-label={sw.label}
                title={sw.label}
                onClick={() => setTweak('theme', sw.id)}
              />
            ))}
          </div>
        </div>

        {/* 明暗模式 */}
        <div className="settings-menu__row">
          <span className="settings-menu__key">{t('tweaks.mode')}</span>
          <SegmentedGroup size="sm" value={mode} onValueChange={(v) => setTweak('mode', v as ModeKey)}>
            <SegmentedItem value="dark">{t('tweaks.dark')}</SegmentedItem>
            <SegmentedItem value="light">{t('tweaks.light')}</SegmentedItem>
          </SegmentedGroup>
        </div>

        {/* 语言 */}
        <div className="settings-menu__row">
          <span className="settings-menu__key">{t('tweaks.lang')}</span>
          <SegmentedGroup size="sm" value={lang} onValueChange={(v) => setTweak('lang', v as LangKey)}>
            <SegmentedItem value="en">EN</SegmentedItem>
            <SegmentedItem value="zh">中文</SegmentedItem>
          </SegmentedGroup>
        </div>

        {/* 密度 */}
        <div className="settings-menu__row">
          <span className="settings-menu__key">{t('tweaks.density')}</span>
          <SegmentedGroup size="sm" value={density} onValueChange={(v) => setTweak('density', v as DensityKey)}>
            <SegmentedItem value="compact">{t('tweaks.compact')}</SegmentedItem>
            <SegmentedItem value="standard">{t('tweaks.standard')}</SegmentedItem>
            <SegmentedItem value="relaxed">{t('tweaks.relaxed')}</SegmentedItem>
          </SegmentedGroup>
        </div>

        {/* 字体 */}
        <div className="settings-menu__row">
          <span className="settings-menu__key">{t('tweaks.font')}</span>
          <SegmentedGroup size="sm" value={font} onValueChange={(v) => setTweak('font', v as FontKey)}>
            <SegmentedItem value="geist">Geist</SegmentedItem>
            <SegmentedItem value="plex">Plex</SegmentedItem>
            <SegmentedItem value="jetbrains">JBM</SegmentedItem>
            <SegmentedItem value="system">Sys</SegmentedItem>
          </SegmentedGroup>
        </div>
      </PopoverContent>
    </Popover>
  );
}
