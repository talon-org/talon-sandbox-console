/* RecordingPlayer — terminal recording playback component.
 * 1:1 visual port of page-recording.jsx prototype.
 * Visual shell only: top bar, terminal stage, steps sidebar, bottom scrubber.
 * Data flow: parent provides frames/steps/currentTime/isPlaying.
 * Built-in rAF loop advances currentTime when isPlaying=true.
 */
import { useEffect, useRef, useMemo, useCallback } from 'react';
import { SegmentedGroup, SegmentedItem, Button } from '@talon-sandbox/react';
import { TlnIcon, Mark } from '../icons/TlnIcon';
import { useT } from '../i18n/useT';

import './RecordingPlayer.css';

// Frame kinds matching API and prototype
export type FrameKind = 'cmd' | 'out' | 'ok' | 'err' | 'dim' | 'info' | 'agent';

export interface RecordingFrame {
  time: number;
  text: string;
  kind?: FrameKind;
}

export interface RecordingStep {
  time: number;
  title: string;
}

export interface RecordingMeta {
  id: string;
  title?: string;
  durationSec: number;
}

export interface RecordingPlayerProps {
  recording: RecordingMeta;
  frames?: RecordingFrame[];
  steps?: RecordingStep[];
  currentTime: number;
  onSeek: (t: number) => void;
  isPlaying: boolean;
  onTogglePlay: () => void;
  speed?: number;
  onSpeedChange?: (s: number) => void;
  onBack?: () => void;
  // Additional meta for top bar
  sandboxName?: string;
  agentName?: string;
}

const SPEED_OPTIONS = [0.5, 1, 1.5, 2];

function fmtT(s: number): string {
  return `${Math.floor(s / 60)}:${Math.floor(s % 60).toString().padStart(2, '0')}`;
}

// Binary search: count of frames with time <= target
function countVisible(frames: RecordingFrame[], target: number): number {
  let lo = 0;
  let hi = frames.length - 1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    const f = frames[mid];
    if (f !== undefined && f.time <= target) lo = mid + 1;
    else hi = mid - 1;
  }
  return lo;
}

export function RecordingPlayer({
  recording,
  frames = [],
  steps = [],
  currentTime,
  onSeek,
  isPlaying,
  onTogglePlay,
  speed = 1,
  onSpeedChange,
  onBack,
  sandboxName,
  agentName,
}: RecordingPlayerProps) {
  const t = useT();
  const dur = recording.durationSec;

  // rAF playback loop — advances currentTime at `speed` rate
  const lastTRef = useRef<number | null>(null);
  const ctRef = useRef(currentTime);
  ctRef.current = currentTime;

  useEffect(() => {
    if (!isPlaying) {
      lastTRef.current = null;
      return;
    }
    let raf: number;
    function tick(now: number) {
      if (lastTRef.current === null) {
        lastTRef.current = now;
        raf = requestAnimationFrame(tick);
        return;
      }
      const dt = (now - lastTRef.current) / 1000;
      lastTRef.current = now;
      const next = ctRef.current + dt * speed;
      if (next >= dur) {
        onSeek(dur);
        onTogglePlay();
        return;
      }
      onSeek(next);
      raf = requestAnimationFrame(tick);
    }
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // intentionally omit currentTime — read via ctRef
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPlaying, speed, dur]);

  // Auto-scroll terminal stage as new lines appear
  const stageRef = useRef<HTMLDivElement>(null);
  const visibleCount = useMemo(() => countVisible(frames, currentTime), [frames, currentTime]);
  const visibleFrames = frames.slice(0, visibleCount);

  // 导出 asciicast v2(.cast):首行 header,其后每帧一行 [time, "o", text]。
  // 这是 asciinema 的标准格式,导出的文件可用 asciinema play 本地回放。
  // frames 为空时按钮 disabled——不导空文件,避免假装有内容可导。
  const handleExportCast = useCallback(() => {
    const header = {
      version: 2,
      width: 80,
      height: 24,
      timestamp: 0,
      title: recording.title ?? recording.id,
    };
    const lines = [JSON.stringify(header)];
    for (const f of frames) {
      // asciicast 事件的 text 末尾补换行,贴近终端逐行输出的视觉
      lines.push(JSON.stringify([f.time, 'o', f.text + '\r\n']));
    }
    const blob = new Blob([lines.join('\n')], { type: 'application/x-asciicast' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${recording.id}.cast`;
    a.click();
    URL.revokeObjectURL(url);
  }, [frames, recording.id, recording.title]);

  useEffect(() => {
    if (stageRef.current) {
      stageRef.current.scrollTop = stageRef.current.scrollHeight;
    }
  }, [visibleCount]);

  // Current active step index
  const currentStepIdx = steps.findIndex(
    (s, i) =>
      s.time <= currentTime &&
      (i === steps.length - 1 || (steps[i + 1]?.time ?? Infinity) > currentTime),
  );

  // Keyboard shortcuts matching prototype: Space / ←→ ±5s / J L ±10s / 0 reset
  useEffect(() => {
    const on = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      if (e.key === ' ')           { e.preventDefault(); onTogglePlay(); }
      else if (e.key === 'ArrowLeft')  { e.preventDefault(); onSeek(Math.max(0, ctRef.current - 5)); }
      else if (e.key === 'ArrowRight') { e.preventDefault(); onSeek(Math.min(dur, ctRef.current + 5)); }
      else if (e.key === 'j')          { onSeek(Math.max(0, ctRef.current - 10)); }
      else if (e.key === 'l')          { onSeek(Math.min(dur, ctRef.current + 10)); }
      else if (e.key === '0')          { onSeek(0); }
    };
    document.addEventListener('keydown', on);
    return () => document.removeEventListener('keydown', on);
  }, [dur, onSeek, onTogglePlay]);

  // Scrubber drag logic
  const scrubRef = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);

  const computeT = useCallback((clientX: number) => {
    if (!scrubRef.current) return 0;
    const box = scrubRef.current.getBoundingClientRect();
    return Math.max(0, Math.min(dur, ((clientX - box.left) / box.width) * dur));
  }, [dur]);

  const onScrubDown = (e: React.MouseEvent) => {
    dragging.current = true;
    onSeek(computeT(e.clientX));
  };

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (dragging.current) onSeek(computeT(e.clientX));
    };
    const onUp = () => { dragging.current = false; };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
    return () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };
  }, [computeT, onSeek]);

  const pct = dur > 0 ? (currentTime / dur) * 100 : 0;

  return (
    <div className="recp">
      {/* Top bar */}
      <div className="recp-top">
        {onBack && (
          <button className="recp-back" type="button" onClick={onBack}>
            <TlnIcon name="arrowLeft" size={14} />
            {t('nav.recordings')}
          </button>
        )}
        <Mark size={11} />
        <div className="recp-top-meta">
          <span className="rtitle">{recording.title ?? recording.id}</span>
          {sandboxName && <span className="rsub">· {sandboxName}</span>}
          {agentName && (
            <span className="ragent">
              <TlnIcon name="box" size={11} />
              {agentName}
            </span>
          )}
        </div>
        <div className="recp-top-actions">
          {/* 导出 .cast(asciicast v2);无帧数据时禁用,不导空文件。Share 已移除
              ——后端无分享端点,不保留指向不存在功能的死按钮。 */}
          <Button size="sm" variant="ghost" onClick={handleExportCast} disabled={frames.length === 0}>
            <TlnIcon name="download" size={14} />
            {t('recordings.exportCast', '.cast')}
          </Button>
        </div>
      </div>

      {/* Stage: terminal output */}
      <div className="recp-stage">
        <div className="recp-stage-inner" ref={stageRef}>
          {visibleFrames.length === 0 && (
            <div className="rline dim">{t('recordings.pressPlay', '# press space or click play to start')}</div>
          )}
          {visibleFrames.map((f, i) => (
            <div key={i} className={'rline ' + (f.kind ?? 'out')}>
              {f.text}
            </div>
          ))}
          {(isPlaying || visibleFrames.length > 0) && (
            <span className="rcaret" />
          )}
        </div>
      </div>

      {/* Steps sidebar */}
      <div className="recp-side">
        <div className="recp-side-head">
          <span className="slabel">STEPS</span>
          {steps.length > 0 && (
            <span className="scount">{currentStepIdx + 1} / {steps.length}</span>
          )}
        </div>
        <div className="recp-steps">
          {steps.map((st, i) => {
            const done   = st.time < currentTime && i !== currentStepIdx;
            const active = i === currentStepIdx;
            return (
              <div
                key={i}
                role="button"
                tabIndex={0}
                className={'recp-step' + (done ? ' done' : active ? ' active' : '')}
                onClick={() => onSeek(st.time)}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSeek(st.time); } }}
              >
                <span className="six">#{String(i + 1).padStart(2, '0')}</span>
                <span className="sts">{fmtT(st.time)}</span>
                <span className="swhat">{st.title}</span>
              </div>
            );
          })}
          {steps.length === 0 && (
            <div style={{ padding: '14px 16px', fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--fg-3)' }}>
              {t('recordings.noSteps', 'No steps recorded')}
            </div>
          )}
        </div>
      </div>

      {/* Bottom: scrubber + controls */}
      <div className="recp-bot">
        {/* Scrubber */}
        <div className="recp-scrubber" ref={scrubRef} onMouseDown={onScrubDown}>
          <div className="rtrack" />
          <div className="rfill" style={{ width: pct + '%' }} />
          {steps.map((s, i) => (
            <div
              key={i}
              className={'rmarker' + (s.time <= currentTime ? ' passed' : '')}
              style={{ left: dur > 0 ? (s.time / dur) * 100 + '%' : '0%' }}
              title={s.title}
            />
          ))}
          <div className="rhandle" style={{ left: `calc(${pct}% - 7px)` }} />
          {/* Native range for a11y */}
          <input
            type="range"
            min={0}
            max={dur}
            step={0.1}
            value={currentTime}
            onChange={(e) => onSeek(+e.target.value)}
            aria-label="Seek"
          />
        </div>

        {/* Controls row */}
        <div className="recp-controls">
          {/* Play/pause */}
          <button
            className="recp-play"
            type="button"
            onClick={() => { if (currentTime >= dur) onSeek(0); onTogglePlay(); }}
            aria-label={isPlaying ? 'Pause' : 'Play'}
          >
            {isPlaying
              ? <svg width="12" height="14" viewBox="0 0 12 14" fill="currentColor"><rect x="0" y="0" width="4" height="14" rx="1"/><rect x="8" y="0" width="4" height="14" rx="1"/></svg>
              : <svg width="12" height="14" viewBox="0 0 12 14" fill="currentColor"><path d="M2 1l10 6-10 6V1z"/></svg>
            }
          </button>
          {/* Reset */}
          <Button size="sm" variant="ghost" iconOnly onClick={() => { onSeek(0); if (isPlaying) onTogglePlay(); }} aria-label="Reset">
            <TlnIcon name="refresh" size={14} />
          </Button>
          {/* Time display */}
          <span className="recp-time">
            <span className="rcur">{fmtT(currentTime)}</span>
            <span className="rdur"> / {fmtT(dur)}</span>
          </span>
          {/* Speed segmented */}
          <div className="recp-speed">
            <SegmentedGroup size="sm" value={String(speed)} onValueChange={(v) => onSpeedChange?.(parseFloat(v))}>
              {SPEED_OPTIONS.map(s => (
                <SegmentedItem key={s} value={String(s)}>{s}×</SegmentedItem>
              ))}
            </SegmentedGroup>
          </div>
          {/* Keyboard hint */}
          <span className="recp-hint">SPACE · ←/→ ±5s · J/L ±10s · 0 reset</span>
        </div>
      </div>
    </div>
  );
}
