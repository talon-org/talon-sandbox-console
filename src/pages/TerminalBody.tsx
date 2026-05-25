/* TerminalBody — xterm.js mount + WebSocket PTY connection.
 * Extracted from PageTerminal to keep that file within the 250-line limit.
 * Owns xterm lifecycle; parent controls reconnect via connectKey increment.
 */
import { useEffect, useRef } from 'react';
import type { Terminal as XTerminal } from 'xterm';
import type { FitAddon as XFitAddon } from '@xterm/addon-fit';
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

    const cs = getComputedStyle(document.documentElement);
    const cv = (n: string) => cs.getPropertyValue(n).trim();

    (async () => {
      const { Terminal } = await import('xterm');
      const { FitAddon } = await import('@xterm/addon-fit');

      if (disposed || !termDivRef.current) return;

      let term: XTerminal;
      let fit: XFitAddon;

      if (!xtermRef.current) {
        term = new Terminal({
          cursorBlink:   true,
          fontFamily:    cv('--font-mono') || 'ui-monospace, monospace',
          fontSize:      13,
          lineHeight:    1.4,
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

      ws.onclose = () => { if (!disposed) onConnected(false); };

      ws.onerror = () => {
        if (disposed) return;
        ws = null;
        wsRef.current = null;
        onConnected(false);
        term.write('\r\n\x1b[31mx Connection failed. Click Reconnect.\x1b[0m\r\n');
      };

      term.onData((data) => {
        if (ws && ws.readyState === WebSocket.OPEN) ws.send(data);
      });

      const onResize = () => {
        if (disposed) return;
        try {
          fit.fit();
          const dim = fit.proposeDimensions();
          if (dim) {
            onDimensions(dim.cols, dim.rows);
            if (ws && ws.readyState === WebSocket.OPEN)
              ws.send(JSON.stringify({ type: 'resize', cols: dim.cols, rows: dim.rows }));
          }
        } catch {}
      };
      window.addEventListener('resize', onResize);

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

      return () => {
        obs.disconnect();
        window.removeEventListener('resize', onResize);
      };
    })();

    return () => {
      disposed = true;
      ws?.close();
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
