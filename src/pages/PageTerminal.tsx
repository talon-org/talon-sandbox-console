/* PageTerminal — full-bleed terminal page.
 * 1:1 port of page-terminal.jsx prototype.
 * Full-bleed (no Shell wrapper). Uses xterm.js v5 + FitAddon.
 * Connects to WebSocket /api/v1/sandboxes/{id}/pty.
 * On WS error shows a red error message and a Reconnect button.
 */
import { useEffect, useRef, useState, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import type { Terminal as XTerminal } from 'xterm';
import type { FitAddon as XFitAddon } from '@xterm/addon-fit';
import { Button } from '@talon-sandbox/react';
import { useT } from '../i18n/useT';
import { TlnIcon } from '../icons/TlnIcon';
import { MOCK_SANDBOXES } from '../mock/data';
import { API_BASE } from '../api/client';
import './PageTerminal.css';

// ── page ──────────────────────────────────────────────────────────────────────
export function PageTerminal() {
  const { id }  = useParams<{ id: string }>();
  const nav     = useNavigate();
  const t       = useT();

  const sandbox = MOCK_SANDBOXES.find(s => s.id === id) ?? MOCK_SANDBOXES[0];
  // TODO: apiGet(`/v1/sandboxes/${id}`) for real sandbox info

  const termDivRef = useRef<HTMLDivElement>(null);
  const xtermRef   = useRef<XTerminal | null>(null);
  const fitRef     = useRef<XFitAddon | null>(null);
  const wsRef      = useRef<WebSocket | null>(null);
  const [recording, setRecording] = useState(false);
  const [cols,      setCols]      = useState(80);
  const [rows,      setRows]      = useState(24);
  const [connected, setConnected] = useState(false);
  const [connectKey, setConnectKey] = useState(0);

  const reconnect = useCallback(() => {
    wsRef.current?.close();
    wsRef.current = null;
    setConnectKey(k => k + 1);
  }, []);

  useEffect(() => {
    if (!termDivRef.current) return;

    let term: XTerminal;
    let fit: XFitAddon;
    let ws: WebSocket | null = null;
    let disposed = false;

    const cs = getComputedStyle(document.documentElement);
    const cv = (n: string) => cs.getPropertyValue(n).trim();

    (async () => {
      const { Terminal }  = await import('xterm');
      const { FitAddon }  = await import('@xterm/addon-fit');

      if (disposed || !termDivRef.current) return;

      // Re-use existing terminal instance across reconnects if possible;
      // on first mount, create a new one.
      if (!xtermRef.current) {
        term = new Terminal({
          cursorBlink: true,
          fontFamily:  cv('--font-mono') || 'ui-monospace, monospace',
          fontSize:    13,
          lineHeight:  1.4,
          letterSpacing: 0,
          theme: {
            background:          cv('--bg-0') || '#000',
            foreground:          cv('--fg-1') || '#cdd6f4',
            cursor:              cv('--acc')  || '#7d97ff',
            cursorAccent:        cv('--bg-0') || '#000',
            selectionBackground: 'rgba(125,151,255,0.25)',
          },
          allowProposedApi: true,
        });

        fit = new FitAddon();
        term.loadAddon(fit);
        term.open(termDivRef.current);
        fit.fit();
        term.focus();

        xtermRef.current = term;
        fitRef.current   = fit;
      } else {
        term = xtermRef.current;
        fit  = fitRef.current!;
      }

      // ── Connect WebSocket ──
      const wsProto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsBase  = API_BASE.startsWith('http') ? API_BASE.replace(/^http/, 'ws') : wsProto + '//' + window.location.host + API_BASE;
      const wsUrl   = `${wsBase}/v1/sandboxes/${sandbox.id}/pty`;

      ws = new WebSocket(wsUrl);
      ws.binaryType = 'arraybuffer';

      ws.onopen = () => {
        if (disposed) { ws?.close(); return; }
        setConnected(true);
        wsRef.current = ws;
      };

      ws.onmessage = (ev) => {
        const data = typeof ev.data === 'string' ? ev.data : new TextDecoder().decode(ev.data as ArrayBuffer);
        term.write(data);
      };

      ws.onclose = () => {
        if (!disposed) setConnected(false);
      };

      ws.onerror = () => {
        if (disposed) return;
        ws = null;
        wsRef.current = null;
        setConnected(false);
        term.write('\r\n\x1b[31m✗ Connection failed. Click Reconnect.\x1b[0m\r\n');
      };

      term.onData((data) => {
        if (ws && ws.readyState === WebSocket.OPEN) {
          ws.send(data);
        }
      });

      const onResize = () => {
        if (disposed) return;
        try {
          fit.fit();
          const dim = fit.proposeDimensions();
          if (dim) {
            setCols(dim.cols);
            setRows(dim.rows);
            if (ws && ws.readyState === WebSocket.OPEN) {
              ws.send(JSON.stringify({ type: 'resize', cols: dim.cols, rows: dim.rows }));
            }
          }
        } catch { /* ignore */ }
      };
      window.addEventListener('resize', onResize);

      // Re-theme on tweaks change
      const obs = new MutationObserver(() => {
        if (!term || disposed) return;
        const cs2 = getComputedStyle(document.documentElement);
        const c2  = (n: string) => cs2.getPropertyValue(n).trim();
        term.options.theme = {
          background:          c2('--bg-0') || '#000',
          foreground:          c2('--fg-1') || '#cdd6f4',
          cursor:              c2('--acc')  || '#7d97ff',
          cursorAccent:        c2('--bg-0') || '#000',
          selectionBackground: 'rgba(125,151,255,0.25)',
        };
      });
      obs.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme', 'data-mode', 'data-font'] });

      return () => {
        obs.disconnect();
        window.removeEventListener('resize', onResize);
      };
    })();

    return () => {
      disposed = true;
      ws?.close();
      // Keep xterm alive across reconnects; only dispose on full unmount handled below.
    };
  // startFakeShell removed; only sandbox.id and connectKey trigger reconnect.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sandbox.id, connectKey]);

  // Full cleanup on unmount
  useEffect(() => {
    return () => {
      wsRef.current?.close();
      xtermRef.current?.dispose();
      xtermRef.current = null;
      fitRef.current   = null;
      wsRef.current    = null;
    };
  }, []);

  return (
    <div className="term-page" role="main" aria-label={`Terminal — ${sandbox.id}`}>
      {/* top chrome */}
      <div className="term-chrome-top">
        <button className="term-back" onClick={() => nav('/sandboxes/' + sandbox.id)}>
          <TlnIcon name="chevronLeft" size={14} />
          {sandbox.id}
        </button>
        <span style={{ width: 1, height: 20, background: 'var(--line)', flex: '0 0 auto' }} />
        <div className="term-info">
          <span className="dot" />
          <span className="tid">{sandbox.id}</span>
          <span className="tsep">·</span>
          <span className="tname">main shell</span>
          {sandbox.task && <span className="ttask">{sandbox.task}</span>}
        </div>
        <div className="term-top-actions">
          <button
            className={'rec-btn' + (recording ? ' on' : '')}
            onClick={() => setRecording(r => !r)}
            aria-pressed={recording}
          >
            <span className="rdot" />
            {recording ? t('term.recording') : t('term.record')}
          </button>
          {!connected && (
            <Button variant="ghost" size="sm" onClick={reconnect}>
              <TlnIcon name="refresh" size={14} />
              Reconnect
            </Button>
          )}
          <Button variant="ghost" size="sm">
            <TlnIcon name="plus" size={14} />
            {t('term.newShell')}
          </Button>
          <Button variant="ghost" size="sm">
            <TlnIcon name="external" size={14} />
            {t('term.detach')}
          </Button>
          <Button variant="ghost" size="sm" iconOnly aria-label="More">
            <TlnIcon name="more" size={14} />
          </Button>
        </div>
      </div>

      {/* terminal body */}
      <div className="term-body">
        <div ref={termDivRef} style={{ height: '100%', width: '100%' }} />
      </div>

      {/* bottom status bar */}
      <div className="term-chrome-bot">
        <div className="bleft">
          <span>pid <span className="bb">4128</span></span>
          <span>node@9d3</span>
          <span>{sandbox.image}</span>
        </div>
        <div className="bright">
          <span><span className="bb">utf-8</span></span>
          <span>{cols} × {rows}</span>
          <span>
            <span
              className="bb"
              style={{ color: connected ? 'var(--ok)' : 'var(--err)' }}
            >
              {connected ? '● connected' : '● disconnected'}
            </span>
          </span>
        </div>
      </div>
    </div>
  );
}
