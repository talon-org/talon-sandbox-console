/* TerminalBody — xterm.js mount + WebSocket PTY connection.
 * Extracted from PageTerminal to keep that file within the 250-line limit.
 * Owns xterm lifecycle; parent controls reconnect via connectKey increment.
 */
import { useEffect, useRef } from 'react';
import type { Terminal as XTerminal } from 'xterm';
import type { FitAddon as XFitAddon } from '@xterm/addon-fit';
import 'xterm/css/xterm.css';
import { sandboxPtyUrl } from '../api/sandboxes';

interface TerminalBodyProps {
  sandboxId: string;
  connectKey: number;
  onConnected: (v: boolean) => void;
  onDimensions: (cols: number, rows: number) => void;
}

export function TerminalBody({ sandboxId, connectKey, onConnected, onDimensions }: TerminalBodyProps) {
  const termDivRef = useRef<HTMLDivElement>(null);
  const xtermRef   = useRef<XTerminal | null>(null);
  const fitRef     = useRef<XFitAddon | null>(null);
  const wsRef      = useRef<WebSocket | null>(null);

  useEffect(() => {
    if (!termDivRef.current) return;
    let disposed = false;
    let ws: WebSocket | null = null;
    // Track every disposable we attach during this effect run so the cleanup
    // can tear them down even when the async IIFE completes after unmount.
    // React StrictMode in dev mounts the effect twice; stacking listeners on
    // a reused xterm instance would otherwise duplicate every keystroke.
    const cleanups: Array<() => void> = [];

    const cs = getComputedStyle(document.documentElement);
    const cv = (n: string) => cs.getPropertyValue(n).trim();

    (async () => {
      const { Terminal } = await import('xterm');
      const { FitAddon } = await import('@xterm/addon-fit');

      if (disposed || !termDivRef.current) return;

      let term: XTerminal;
      let fit: XFitAddon;

      if (!xtermRef.current) {
        // Use a system-provided monospace stack and skip custom webfonts:
        // xterm measures the font in a one-shot test glyph at construction
        // time; if Geist Mono hasn't finished loading yet, the canvas cell
        // width is computed against the fallback (a wider proportional
        // metric) and never recomputed, so every glyph ends up with extra
        // air around it. ui-monospace/Menlo are always immediately ready.
        term = new Terminal({
          cursorBlink:   true,
          fontFamily:    'ui-monospace, Menlo, "SF Mono", Consolas, monospace',
          fontSize:      13,
          lineHeight:    1.2,
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
        xtermRef.current = term;
        fitRef.current   = fit;
      } else {
        term = xtermRef.current;
        fit  = fitRef.current!;
      }
      // Focus on every effect run, deferred to the next frame so a parent
      // re-render in the same tick can't steal it back. The status bar will
      // show "已连接" but the cursor would otherwise sit unfocused and silent
      // — xterm only fires onData when its hidden textarea has focus.
      const focusTerm = () => term.focus();
      requestAnimationFrame(focusTerm);

      // Clicking anywhere in the terminal container should also focus xterm.
      // The container is a plain <div ref=termDivRef>; without an explicit
      // mousedown handler, clicking on empty rows (no character to hit-test)
      // doesn't reach xterm's internal listeners and focus stays elsewhere.
      const onMouseDown = () => term.focus();
      const div = termDivRef.current;
      div.addEventListener('mousedown', onMouseDown);
      cleanups.push(() => div.removeEventListener('mousedown', onMouseDown));

      ws = new WebSocket(sandboxPtyUrl(sandboxId));
      ws.binaryType = 'arraybuffer';
      wsRef.current = ws;

      ws.onopen = () => {
        if (disposed) { ws?.close(); return; }
        onConnected(true);
        const dim = fitRef.current?.proposeDimensions();
        if (dim) {
          onDimensions(dim.cols, dim.rows);
          ws?.send(JSON.stringify({ type: 'resize', cols: dim.cols, rows: dim.rows }));
        }
      };

      ws.onmessage = (ev) => {
        const data = typeof ev.data === 'string'
          ? ev.data
          : new TextDecoder().decode(ev.data as ArrayBuffer);
        term.write(data);
      };

      ws.onclose = (ev) => {
        if (disposed) return;
        onConnected(false);
        // Surface the server-supplied close code so the user can tell idle
        // timeout (1000) from auth failure (1008) from a 5xx upgrade.
        const why = ev.reason ? `${ev.code} ${ev.reason}` : String(ev.code);
        term.write(`\r\n\x1b[33m[pty closed: ${why}]\x1b[0m\r\n`);
      };

      ws.onerror = () => {
        if (disposed) return;
        ws = null;
        wsRef.current = null;
        onConnected(false);
        term.write('\r\n\x1b[31mx Connection failed. Click Reconnect.\x1b[0m\r\n');
      };

      // Capture the local ws in the closure rather than reading wsRef so a
      // re-run of this effect can't reroute keystrokes to its successor.
      // The disposable is released on cleanup so a remount doesn't stack
      // duplicate onData handlers onto the reused xterm.
      const localWs = ws;
      // xterm hands us a string; encode to bytes before send() so the
      // WebSocket frames as binary. The server distinguishes keystrokes
      // (binary) from control messages like resize (text JSON) — sending
      // a string would route every keystroke into the JSON branch and
      // get dropped as unparsable.
      const enc = new TextEncoder();
      const dataSub = term.onData((data) => {
        if (localWs.readyState === WebSocket.OPEN) localWs.send(enc.encode(data));
      });
      cleanups.push(() => dataSub.dispose());

      const onResize = () => {
        if (disposed) return;
        try {
          fit.fit();
          const dim = fit.proposeDimensions();
          if (dim) {
            onDimensions(dim.cols, dim.rows);
            if (localWs.readyState === WebSocket.OPEN)
              localWs.send(JSON.stringify({ type: 'resize', cols: dim.cols, rows: dim.rows }));
          }
        } catch {}
      };
      window.addEventListener('resize', onResize);
      cleanups.push(() => window.removeEventListener('resize', onResize));

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
      obs.observe(document.documentElement, {
        attributes: true,
        attributeFilter: ['data-theme', 'data-mode', 'data-font'],
      });
      cleanups.push(() => obs.disconnect());
    })();

    return () => {
      disposed = true;
      ws?.close();
      for (const fn of cleanups) fn();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sandboxId, connectKey]);

  useEffect(() => {
    return () => {
      wsRef.current?.close();
      xtermRef.current?.dispose();
      xtermRef.current = null;
      fitRef.current   = null;
      wsRef.current    = null;
    };
  }, []);

  return <div ref={termDivRef} style={{ height: '100%', width: '100%' }} />;
}
