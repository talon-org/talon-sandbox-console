/* TweaksPanel — fixed bottom-right collapsible settings panel.
 * Theme swatches + mode/lang/density/font segmented controls.
 * 1:1 port of shell.jsx prototype Tweaks component.
 * Visual shell: bottom-right fixed overlay, collapsible via header click.
 */
import { useState } from 'react';
import { SegmentedGroup, SegmentedItem } from '@talon-sandbox/react';
import { Mark } from '../icons/TlnIcon';
import { useApp } from '../store';
import { useT } from '../i18n/useT';
import type { ThemeKey, ModeKey, DensityKey, FontKey, LangKey } from '../store';

import './TweaksPanel.css';

// Theme swatches matching the design-source prototype
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

export function TweaksPanel() {
  const t = useT();
  const theme   = useApp(s => s.theme);
  const mode    = useApp(s => s.mode);
  const density = useApp(s => s.density);
  const font    = useApp(s => s.font);
  const lang    = useApp(s => s.lang);
  const setTweak = useApp(s => s.setTweak);

  const [open, setOpen] = useState(true);

  return (
    <div className={'tweaks-panel' + (open ? '' : ' tweaks-panel--collapsed')}>
      {/* Header — click to toggle */}
      <button
        type="button"
        className="tweaks-panel__head"
        onClick={() => setOpen(o => !o)}
        aria-expanded={open}
      >
        <Mark size={10} />
        <span className="tweaks-panel__label">{t('tweaks.title')}</span>
        <svg
          className="tweaks-panel__chev"
          width="12" height="12" viewBox="0 0 16 16"
          fill="none" stroke="currentColor" strokeWidth="1.5"
          aria-hidden="true"
        >
          <path d="M4 6l4 4 4-4"/>
        </svg>
      </button>

      {/* Body — visible when open */}
      {open && (
        <div className="tweaks-panel__body">
          {/* Theme swatches */}
          <div className="tweaks-panel__row">
            <span className="tweaks-panel__key">{t('tweaks.theme')}</span>
            <div className="tweaks-panel__swatches">
              {THEME_SWATCHES.map(sw => (
                <button
                  key={sw.id}
                  type="button"
                  className="tweaks-panel__swatch"
                  style={{ background: sw.bg }}
                  aria-pressed={theme === sw.id}
                  aria-label={sw.label}
                  title={sw.label}
                  onClick={() => setTweak('theme', sw.id)}
                />
              ))}
            </div>
          </div>

          {/* Mode */}
          <div className="tweaks-panel__row">
            <span className="tweaks-panel__key">{t('tweaks.mode')}</span>
            <SegmentedGroup size="sm" value={mode} onValueChange={(v) => setTweak('mode', v as ModeKey)}>
              <SegmentedItem value="dark">{t('tweaks.dark')}</SegmentedItem>
              <SegmentedItem value="light">{t('tweaks.light')}</SegmentedItem>
            </SegmentedGroup>
          </div>

          {/* Language */}
          <div className="tweaks-panel__row">
            <span className="tweaks-panel__key">{t('tweaks.lang')}</span>
            <SegmentedGroup size="sm" value={lang} onValueChange={(v) => setTweak('lang', v as LangKey)}>
              <SegmentedItem value="en">EN</SegmentedItem>
              <SegmentedItem value="zh">中文</SegmentedItem>
            </SegmentedGroup>
          </div>

          {/* Density */}
          <div className="tweaks-panel__row">
            <span className="tweaks-panel__key">{t('tweaks.density')}</span>
            <SegmentedGroup size="sm" value={density} onValueChange={(v) => setTweak('density', v as DensityKey)}>
              <SegmentedItem value="compact">{t('tweaks.compact')}</SegmentedItem>
              <SegmentedItem value="standard">{t('tweaks.standard')}</SegmentedItem>
              <SegmentedItem value="relaxed">{t('tweaks.relaxed')}</SegmentedItem>
            </SegmentedGroup>
          </div>

          {/* Font */}
          <div className="tweaks-panel__row">
            <span className="tweaks-panel__key">{t('tweaks.font')}</span>
            <SegmentedGroup size="sm" value={font} onValueChange={(v) => setTweak('font', v as FontKey)}>
              <SegmentedItem value="geist">Geist</SegmentedItem>
              <SegmentedItem value="plex">Plex</SegmentedItem>
              <SegmentedItem value="jetbrains">JBM</SegmentedItem>
              <SegmentedItem value="system">Sys</SegmentedItem>
            </SegmentedGroup>
          </div>
        </div>
      )}
    </div>
  );
}
