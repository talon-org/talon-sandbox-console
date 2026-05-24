/* PageRecording — full-bleed asciinema-style playback.
 * 1:1 port of page-recording.jsx prototype (playback view).
 * rAF-driven frame replay, step sidebar, scrubber with step markers.
 */
import { useRef, useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button, Segmented } from '@talon-sandbox/react';
import { TlnIcon } from '../icons/TlnIcon';
import { MOCK_RECORDINGS } from '../mock/data';
import type { MockRecording } from '../mock/data';

import './PageRecording.css';

// ── recording timeline data ───────────────────────────────────────────────────
interface RecFrame {
  at: number;
  kind: 'agent' | 'cmd' | 'out' | 'ok' | 'err' | 'dim' | 'info';
  step?: string;
  text: string;
}

const REC_FRAMES: Record<string, RecFrame[]> = {
  rec_001: [
    { at: 0.0,  kind: 'agent', step: 'Clone repo',            text: 'analyzing task · cloning github.com/acme/dashboard' },
    { at: 0.6,  kind: 'cmd',                                   text: 'gh repo clone acme/dashboard /workspace' },
    { at: 1.2,  kind: 'info',                                  text: "Cloning into '/workspace'..." },
    { at: 1.8,  kind: 'dim',                                   text: 'Receiving objects: 100% (412/412), 12.3 MiB | 8.4 MiB/s' },
    { at: 2.4,  kind: 'ok',                                    text: 'Resolving deltas: 100% (218/218), done.' },
    { at: 3.5,  kind: 'agent', step: 'Install dependencies',   text: 'detected package.json · running npm install' },
    { at: 3.7,  kind: 'cmd',                                   text: 'cd /workspace && npm install' },
    { at: 5.2,  kind: 'dim',                                   text: 'npm warn deprecated source-map-url@0.4.1: deprecated' },
    { at: 6.8,  kind: 'ok',                                    text: 'added 412 packages in 8.2s' },
    { at: 7.2,  kind: 'dim',                                   text: '17 packages are looking for funding' },
    { at: 8.4,  kind: 'agent', step: 'Inspect structure',      text: 'reading src/ — identified Next.js app router' },
    { at: 8.6,  kind: 'cmd',                                   text: 'ls src/' },
    { at: 8.9,  kind: 'out',                                   text: 'app/ components/ lib/ styles/ middleware.ts' },
    { at: 10.2, kind: 'agent', step: 'Read existing styles',   text: 'reading src/styles/tokens.css — found existing palette' },
    { at: 10.5, kind: 'cmd',                                   text: 'cat src/styles/tokens.css | head -20' },
    { at: 11.0, kind: 'out',                                   text: ':root { --bg-1: #0a0a0b; --fg-1: #d4d7e0; --acc: #7aa2f7; }' },
    { at: 12.5, kind: 'agent', step: 'Write Header component', text: 'creating src/components/Header.tsx with sticky scroll behavior' },
    { at: 12.7, kind: 'cmd',                                   text: 'cat > src/components/Header.tsx' },
    { at: 13.6, kind: 'ok',                                    text: 'wrote 84 lines · 2.1 KiB' },
    { at: 15.2, kind: 'agent', step: 'Run dev server',         text: 'starting vite dev server to preview' },
    { at: 15.4, kind: 'cmd',                                   text: 'npm run dev' },
    { at: 15.9, kind: 'info',                                  text: 'vite v5.4.2 ready in 412 ms' },
    { at: 16.0, kind: 'info',                                  text: '➜ Local:    http://localhost:5173/' },
    { at: 16.1, kind: 'dim',                                   text: '➜ Network:  use --host to expose' },
    { at: 18.0, kind: 'agent', step: 'Expose preview',         text: 'exposing port 5173 via talon' },
    { at: 18.2, kind: 'cmd',                                   text: 'talon expose 5173' },
    { at: 18.5, kind: 'ok',                                    text: '✓ port :5173 exposed at https://sb-42a1-5173.preview.talon.dev' },
    { at: 20.0, kind: 'agent', step: 'Verify rendering',       text: 'curling preview URL to check 200 response' },
    { at: 20.2, kind: 'cmd',                                   text: 'curl -sI https://sb-42a1-5173.preview.talon.dev' },
    { at: 20.7, kind: 'info',                                  text: 'HTTP/2 200' },
    { at: 20.8, kind: 'dim',                                   text: 'content-type: text/html; charset=utf-8' },
    { at: 22.0, kind: 'agent', step: 'Run tests',              text: 'running existing test suite to confirm no regressions' },
    { at: 22.2, kind: 'cmd',                                   text: 'npm test' },
    { at: 23.8, kind: 'ok',                                    text: 'PASS  src/header.test.ts  (3 tests · 12ms)' },
    { at: 24.0, kind: 'err',                                   text: 'FAIL  src/footer.test.ts  (expected 2026, got 2025)' },
    { at: 25.5, kind: 'agent', step: 'Patch year reference',   text: 'auto-patching outdated copyright year in Footer' },
    { at: 25.7, kind: 'cmd',                                   text: "sed -i 's/2025/2026/g' src/components/Footer.tsx" },
    { at: 26.0, kind: 'ok',                                    text: '1 file changed' },
    { at: 26.5, kind: 'cmd',                                   text: 'npm test' },
    { at: 28.0, kind: 'ok',                                    text: 'Tests: 5 total · 5 passed' },
    { at: 29.0, kind: 'agent', step: 'Commit changes',         text: 'committing on branch agent/dashboard-build' },
    { at: 29.2, kind: 'cmd',                                   text: 'git checkout -b agent/dashboard-build && git add -A && git commit -m "feat: sticky header + footer year fix"' },
    { at: 30.5, kind: 'ok',                                    text: '[agent/dashboard-build a3f7c0] feat: sticky header + footer year fix' },
    { at: 30.6, kind: 'dim',                                   text: ' 2 files changed, 87 insertions(+), 2 deletions(-)' },
    { at: 32.0, kind: 'agent', step: 'Open pull request',      text: 'opening PR · summarizing changes' },
    { at: 32.2, kind: 'cmd',                                   text: 'gh pr create --title "feat: sticky header" --body "..."' },
    { at: 33.5, kind: 'ok',                                    text: '✓ https://github.com/acme/dashboard/pull/217' },
    { at: 34.0, kind: 'agent', step: 'Done',                   text: 'task complete · session paused for review' },
  ],
};

// fallback frames for recordings that don't have explicit data
function makeFallbackFrames(r: MockRecording): RecFrame[] {
  return [
    { at: 0.0, kind: 'agent', step: 'Start', text: r.title },
    { at: 0.5, kind: 'cmd',  text: 'talon status' },
    { at: 1.0, kind: 'ok',   text: 'sandbox ' + r.sandboxId + ' · running' },
    { at: 2.0, kind: 'agent', step: 'Done', text: 'session complete' },
  ];
}

function fmtT(s: number): string {
  return `${Math.floor(s / 60)}:${Math.floor(s % 60).toString().padStart(2, '0')}`;
}

export function PageRecording() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const recording = MOCK_RECORDINGS.find(r => r.id === id) ?? MOCK_RECORDINGS[0];
  // TODO: replace with apiGet('/v1/recordings/' + id)

  const frames = REC_FRAMES[recording.id] ?? makeFallbackFrames(recording);
  const duration = frames[frames.length - 1].at + 2;

  const [currentT, setCurrentT] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [speed, setSpeed] = useState(1);
  const rafRef = useRef<number>(0);
  const lastTickRef = useRef<number>(0);
  const stageRef = useRef<HTMLDivElement>(null);

  // rAF playback loop
  useEffect(() => {
    if (!playing) return;
    lastTickRef.current = performance.now();
    const tick = (now: number) => {
      const dt = (now - lastTickRef.current) / 1000;
      lastTickRef.current = now;
      setCurrentT(prev => {
        const next = prev + dt * speed;
        if (next >= duration) { setPlaying(false); return duration; }
        return next;
      });
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [playing, speed, duration]);

  const visibleFrames = frames.filter(f => f.at <= currentT);

  // auto-scroll stage to bottom as frames appear
  useEffect(() => {
    if (stageRef.current) {
      stageRef.current.scrollTop = stageRef.current.scrollHeight;
    }
  }, [visibleFrames.length]);

  const steps = frames.filter(f => f.kind === 'agent');
  const currentStepIdx = steps.findIndex((s, i) =>
    s.at <= currentT && (i === steps.length - 1 || steps[i + 1].at > currentT)
  );

  const seekTo = (newT: number) => {
    setCurrentT(Math.max(0, Math.min(duration, newT)));
  };

  const pct = (currentT / duration) * 100;

  return (
    <div className="recp">
      {/* top bar */}
      <div className="recp-top">
        <button className="rback" onClick={() => navigate('/recordings')}>
          <TlnIcon name="chevronRight" size={14} style={{ transform: 'rotate(180deg)' }} />
          Recordings
        </button>
        <div style={{ width: 1, height: 20, background: 'var(--line)' }} />
        <div className="rmeta">
          <span className="rtitle">{recording.title}</span>
          <span style={{ color: 'var(--fg-4, var(--fg-3))' }}>·</span>
          <span className="rsub">{recording.sandboxId}</span>
          <span style={{ color: 'var(--fg-4, var(--fg-3))' }}>·</span>
          <span className="rsub">
            {Math.floor(recording.durationSec / 60)}m {(recording.durationSec % 60).toString().padStart(2, '0')}s
          </span>
          <span className="ragent">
            <TlnIcon name="agent" size={11} />
            {recording.agent}
          </span>
        </div>
        <div className="ractions">
          <Button variant="ghost" size="sm">
            <TlnIcon name="copy" size={13} />
            Copy share link
          </Button>
          <Button variant="ghost" size="sm">
            <TlnIcon name="download" size={13} />
            Export .cast
          </Button>
        </div>
      </div>

      {/* terminal stage */}
      <div className="recp-stage">
        <div className="recp-stage-inner" ref={stageRef}>
          {visibleFrames.map((f, i) => {
            if (f.kind === 'agent') {
              return (
                <div key={i} className="rline agent">
                  <span style={{ flex: 1 }}>
                    {f.step}
                    <span style={{ color: 'var(--fg-3)', marginLeft: 8 }}>· {f.text}</span>
                  </span>
                </div>
              );
            }
            return <div key={i} className={'rline ' + f.kind}>{f.text}</div>;
          })}
          {playing && currentT < duration && <span className="rcaret" />}
        </div>
      </div>

      {/* steps sidebar */}
      <div className="recp-side">
        <div className="rside-head">
          <TlnIcon name="zap" size={12} style={{ color: 'var(--fg-3)' }} />
          <span className="slabel">Agent steps</span>
          <span className="scount" style={{ marginLeft: 'auto' }}>
            {currentStepIdx + 1} / {steps.length}
          </span>
        </div>
        <div className="rsteps">
          {steps.map((step, i) => (
            <div
              key={i}
              className={
                'recp-step' +
                (i === currentStepIdx ? ' active' : step.at <= currentT ? ' done' : '')
              }
              onClick={() => seekTo(step.at)}
            >
              <span className="six">#{i + 1}</span>
              <span className="sts">{fmtT(step.at)}</span>
              <span className="swhat">{step.step}</span>
            </div>
          ))}
        </div>
      </div>

      {/* bottom controls */}
      <div className="recp-bot">
        {/* scrubber */}
        <div className="rscrubber">
          <div className="rtrack" />
          <div className="rfill" style={{ width: pct + '%' }} />
          {steps.map((s, i) => (
            <div
              key={i}
              className={'rmarker' + (s.at <= currentT ? ' passed' : '')}
              style={{ left: ((s.at / duration) * 100) + '%' }}
            />
          ))}
          <div className="rhandle" style={{ left: `calc(${pct}% - 7px)` }} />
          <input
            type="range"
            min={0}
            max={duration}
            step={0.1}
            value={currentT}
            onChange={e => seekTo(+e.target.value)}
          />
        </div>

        {/* play controls */}
        <div className="rcontrols">
          <button
            className="rplay"
            onClick={() => {
              if (currentT >= duration) setCurrentT(0);
              setPlaying(p => !p);
            }}
            aria-label={playing ? 'Pause' : 'Play'}
          >
            <TlnIcon name={playing ? 'pause' : 'play'} size={14} />
          </button>
          <div className="rtime">
            <span className="rcur">{fmtT(currentT)}</span> / {fmtT(duration)}
          </div>
          <Button
            variant="ghost"
            size="sm"
            iconOnly
            aria-label="Restart"
            onClick={() => setCurrentT(0)}
          >
            <TlnIcon name="refresh" size={13} />
          </Button>
          <div className="rspeed">
            <Segmented
              value={String(speed)}
              onChange={v => setSpeed(+v)}
              size="sm"
              options={[
                { value: '0.5', label: '0.5×' },
                { value: '1',   label: '1×' },
                { value: '2',   label: '2×' },
                { value: '4',   label: '4×' },
              ]}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
