/* PageTerminal — full-bleed terminal page.
 * 1:1 port of page-terminal.jsx prototype.
 * Full-bleed (no Shell wrapper). Uses xterm.js v5 + FitAddon.
 * Connects to WebSocket /api/v1/sandboxes/{id}/pty.
 * Falls back to a fake local shell when WS is not available.
 */
import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import type { Terminal as XTerminal } from 'xterm';
import type { FitAddon as XFitAddon } from '@xterm/addon-fit';
import { Button } from '@talon-sandbox/react';
import { useT } from '../i18n/useT';
import { TlnIcon } from '../icons/TlnIcon';
import { MOCK_SANDBOXES } from '../mock/data';
import { API_BASE } from '../api/client';

// ── inject styles once ────────────────────────────────────────────────────────
if (!document.getElementById('tln-page-terminal-styles')) {
  const s = document.createElement('style');
  s.id = 'tln-page-terminal-styles';
  s.textContent = `
.term-page { position: fixed; inset: 0; display: flex; flex-direction: column; background: var(--bg-1); z-index: 10; }
.term-chrome-top {
  height: 44px; border-bottom: 1px solid var(--line);
  display: flex; align-items: center; padding: 0 16px; gap: 12px;
  background: var(--bg-1); flex: 0 0 auto;
}
.term-back {
  display: flex; align-items: center; gap: 6px;
  border: 0; background: transparent; color: var(--fg-2);
  cursor: pointer; padding: 4px 8px; border-radius: var(--r-2);
  font-family: inherit; font-size: 12.5px;
}
.term-back:hover { color: var(--fg-0); background: var(--bg-hover); }
.term-info { display: flex; align-items: center; gap: 10px; min-width: 0; }
.term-info .dot { width: 8px; height: 8px; border-radius: 50%; background: var(--ok); box-shadow: 0 0 0 3px var(--ok-soft); animation: tln-pulse 1.6s ease-in-out infinite; flex: 0 0 auto; }
.term-info .tid  { font-family: var(--font-mono); font-size: 13px; color: var(--fg-0); font-weight: 500; }
.term-info .tsep { color: var(--fg-4, var(--fg-3)); }
.term-info .tname{ font-family: var(--font-mono); font-size: 12px; color: var(--fg-2); }
.term-info .ttask{ font-size: 12px; color: var(--fg-3); margin-left: 8px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.term-top-actions { margin-left: auto; display: flex; align-items: center; gap: 6px; }
.rec-btn {
  display: flex; align-items: center; gap: 6px; height: 26px; padding: 0 10px;
  border-radius: var(--r-2); border: 1px solid var(--line); background: var(--bg-2);
  color: var(--fg-1); font-family: var(--font-mono); font-size: 10.5px;
  text-transform: uppercase; letter-spacing: 0.08em; cursor: pointer;
}
.rec-btn:hover { border-color: var(--line-strong); }
.rec-btn .rdot { width: 8px; height: 8px; border-radius: 50%; background: var(--fg-4, var(--fg-3)); }
.rec-btn.on { color: var(--err); border-color: var(--err); background: var(--err-soft); }
.rec-btn.on .rdot { background: var(--err); animation: tln-pulse 0.9s ease-in-out infinite; }

.term-body {
  flex: 1; min-height: 0; background: var(--bg-0);
  padding: 8px 12px; overflow: hidden; position: relative;
}
.term-body .xterm        { height: 100% !important; }
.term-body .xterm-viewport { background: transparent !important; }

.term-chrome-bot {
  height: 28px; border-top: 1px solid var(--line);
  display: flex; align-items: center; padding: 0 16px; gap: 16px;
  font-family: var(--font-mono); font-size: 10.5px; color: var(--fg-3);
  background: var(--bg-1); flex: 0 0 auto;
}
.term-chrome-bot .bleft, .term-chrome-bot .bright { display: flex; align-items: center; gap: 14px; }
.term-chrome-bot .bright { margin-left: auto; }
.term-chrome-bot .bb { color: var(--fg-1); }
`;
  document.head.appendChild(s);
}

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

  useEffect(() => {
    if (!termDivRef.current) return;

    // Dynamic import to avoid SSR issues
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

      // ── Try real WebSocket ──
      const wsProto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsBase  = API_BASE.startsWith('http') ? API_BASE.replace(/^http/, 'ws') : wsProto + '//' + window.location.host + API_BASE;
      const wsUrl   = `${wsBase}/v1/sandboxes/${sandbox.id}/pty`;

      try {
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
          // Fall through to fake shell
          ws = null;
          wsRef.current = null;
          startFakeShell(term, sandbox);
        };

        term.onData((data) => {
          if (ws && ws.readyState === WebSocket.OPEN) {
            ws.send(data);
          }
        });

        // Give WS 1s to connect, otherwise start fake shell
        setTimeout(() => {
          if (!disposed && ws && ws.readyState !== WebSocket.OPEN) {
            ws.close();
            ws = null;
            wsRef.current = null;
            startFakeShell(term, sandbox);
          }
        }, 1000);
      } catch {
        startFakeShell(term, sandbox);
      }

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
      xtermRef.current?.dispose();
      xtermRef.current = null;
      fitRef.current   = null;
      wsRef.current    = null;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sandbox.id]);

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
            {recording ? 'Recording' : 'Record'}
          </button>
          <Button variant="ghost" size="sm">
            <TlnIcon name="plus" size={14} />
            New shell
          </Button>
          <Button variant="ghost" size="sm">
            <TlnIcon name="external" size={14} />
            Detach
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
            <span className="bb" style={{ color: connected ? 'var(--ok)' : 'var(--fg-3)' }}>
              {connected ? '● connected' : '● local shell'}
            </span>
          </span>
        </div>
      </div>
    </div>
  );
}

// ── fake shell ────────────────────────────────────────────────────────────────
function startFakeShell(term: XTerminal, sandbox: { id: string; image?: string; task?: string; cpu?: number; cpuLimit?: number; mem?: number; memLimit?: number; ports?: { port: number }[]; secrets?: string[]; tenant?: string }) {
  const C = {
    reset:  '\x1b[0m',
    bold:   '\x1b[1m',
    dim:    '\x1b[2m',
    grey:   '\x1b[38;5;244m',
    acc:    '\x1b[38;5;111m',
    ok:     '\x1b[38;5;114m',
    err:    '\x1b[38;5;204m',
    info:   '\x1b[38;5;117m',
    mag:    '\x1b[38;5;177m',
  };
  let line = ''; let cursor = 0;
  const history: string[] = []; let histIdx = -1;
  let cwd = '/workspace';

  const prompt  = () => `${C.acc}❯${C.reset} ${C.grey}${cwd}${C.reset} `;
  const writeln = (str = '') => term.write(str + '\r\n');
  const writePrompt = () => term.write(prompt());

  const fsTree: Record<string, string[]> = {
    '/workspace': ['app/', 'public/', 'node_modules/', 'package.json', 'next.config.js', 'README.md', '.env.local'],
    '/workspace/app': ['index.tsx', 'globals.css', 'layout.tsx'],
    '/workspace/public': ['favicon.svg', 'logo.png'],
  };

  const commands: Record<string, (args: string[]) => void> = {
    help() {
      writeln(`${C.bold}commands${C.reset}`);
      ['help', 'ls', 'pwd', 'cd <dir>', 'cat <file>', 'npm <args>', 'talon <cmd>', 'clear', 'exit'].forEach(cmd => {
        writeln(`  ${C.info}${cmd}${C.reset}`);
      });
    },
    ls(args) {
      const target = args[0] ? (args[0].startsWith('/') ? args[0] : cwd + '/' + args[0]) : cwd;
      const files = fsTree[target.replace(/\/$/, '')];
      if (!files) { writeln(`${C.err}ls: ${target}: No such file or directory${C.reset}`); return; }
      writeln(files.map(f => f.endsWith('/') ? `${C.info}${f}${C.reset}` : f).join('  '));
    },
    pwd() { writeln(cwd); },
    cd(args) {
      if (!args[0]) { cwd = '/workspace'; return; }
      const next = args[0] === '..' ? (cwd.split('/').slice(0, -1).join('/') || '/') :
        args[0].startsWith('/') ? args[0] : (cwd + '/' + args[0]).replace(/\/$/, '');
      if (fsTree[next]) cwd = next;
      else writeln(`${C.err}cd: ${args[0]}: No such directory${C.reset}`);
    },
    cat(args) {
      if (!args[0]) { writeln(`${C.err}cat: missing operand${C.reset}`); return; }
      if (args[0] === 'package.json') {
        writeln(`{\n  ${C.info}"name"${C.reset}: ${C.ok}"next-dev"${C.reset},\n  ${C.info}"version"${C.reset}: ${C.ok}"0.1.0"${C.reset}\n}`);
      } else writeln(`${C.err}cat: ${args[0]}: No such file${C.reset}`);
    },
    npm(args) {
      if (args[0] === 'run' && args[1] === 'dev') {
        writeln(`\n${C.grey}>${C.reset} ${C.info}vite${C.reset} v5.4.2 ready in ${C.ok}412 ms${C.reset}`);
        writeln(`${C.grey}>${C.reset} Local:   ${C.info}http://localhost:5173/${C.reset}`);
      } else if (args[0] === 'install') {
        writeln(`\n${C.dim}added ${C.info}412${C.reset}${C.dim} packages in 8.2s${C.reset}`);
        writeln(`${C.ok}✓${C.reset} ${C.dim}dependencies up to date${C.reset}`);
      } else writeln(`${C.grey}usage: npm run dev | npm install | npm test${C.reset}`);
    },
    talon(args) {
      const sub = (args[0] ?? '').toLowerCase();
      if (sub === 'status') {
        writeln(`status   ${C.ok}running${C.reset}`);
        writeln(`cpu      ${C.info}${sandbox.cpu ?? 1.24}${C.reset} / ${sandbox.cpuLimit ?? 2} vCPU`);
        writeln(`memory   ${C.info}${sandbox.mem ?? 1542}${C.reset} / ${sandbox.memLimit ?? 4096} MiB`);
        writeln(`ports    ${C.info}${(sandbox.ports ?? []).map(p => ':' + p.port).join(' ') || '—'}${C.reset}`);
      } else if (sub === 'whoami') {
        writeln(`agent · ${C.mag}claude-sonnet-4.5${C.reset}`);
        writeln(`sandbox · ${C.info}${sandbox.id}${C.reset}`);
        writeln(`tenant  · ${sandbox.tenant ?? '—'}`);
      } else if (sub === 'secrets') {
        writeln((sandbox.secrets ?? []).map(s => `${C.mag}${s}${C.reset}`).join('\n') || 'no secrets mounted');
      } else writeln(`${C.grey}talon <whoami|status|secrets|expose [port]|record>${C.reset}`);
    },
    clear() { term.clear(); },
    exit()  { writeln(`${C.dim}detached. session preserved.${C.reset}`); },
  };

  const exec = (raw: string) => {
    const trimmed = raw.trim();
    if (!trimmed) return;
    if (trimmed !== history[0]) history.unshift(trimmed);
    histIdx = -1;
    const [cmd, ...args] = trimmed.split(/\s+/);
    if (commands[cmd]) commands[cmd](args);
    else if (cmd === 'echo') writeln(args.join(' '));
    else writeln(`${C.err}command not found:${C.reset} ${cmd}  ${C.dim}(try 'help')${C.reset}`);
  };

  const redraw = () => {
    term.write('\r\x1b[K');
    term.write(prompt() + line);
    if (cursor < line.length) term.write(`\x1b[${line.length - cursor}D`);
  };

  // banner
  writeln('');
  writeln(`${C.bold}talon shell${C.reset}${C.dim} · ${sandbox.id} · node@9d3 · /workspace${C.reset}`);
  writeln(`${C.dim}image: ${sandbox.image ?? '—'}  ·  ${sandbox.task ?? 'no task'}${C.reset}`);
  writeln(`${C.dim}type 'help' to see commands. ^C to interrupt, ^D to detach.${C.reset}`);
  writeln('');
  writePrompt();

  // boot animation — type out "talon status"
  setTimeout(() => {
    const bootCmd = 'talon status';
    let i = 0;
    const iv = setInterval(() => {
      if (i >= bootCmd.length) {
        clearInterval(iv);
        term.write('\r\n');
        exec(bootCmd);
        writePrompt();
        return;
      }
      term.write(bootCmd[i]);
      line += bootCmd[i];
      cursor++;
      i++;
    }, 60);
  }, 800);

  term.onData((data) => {
    for (const ch of data) {
      const code = ch.charCodeAt(0);
      if (code === 13) { // Enter
        term.write('\r\n');
        const cmd = line; line = ''; cursor = 0;
        if (cmd) exec(cmd);
        writePrompt();
      } else if (code === 127) { // Backspace
        if (cursor > 0) { line = line.slice(0, cursor - 1) + line.slice(cursor); cursor--; redraw(); }
      } else if (ch === '\x1b[A') { // Up
        if (history.length && histIdx < history.length - 1) { histIdx++; line = history[histIdx]; cursor = line.length; redraw(); }
      } else if (ch === '\x1b[B') { // Down
        if (histIdx > 0) { histIdx--; line = history[histIdx]; cursor = line.length; redraw(); }
        else if (histIdx === 0) { histIdx = -1; line = ''; cursor = 0; redraw(); }
      } else if (ch === '\x1b[C') { // Right
        if (cursor < line.length) { cursor++; term.write('\x1b[C'); }
      } else if (ch === '\x1b[D') { // Left
        if (cursor > 0) { cursor--; term.write('\x1b[D'); }
      } else if (code === 3) { // Ctrl+C
        term.write('^C\r\n'); line = ''; cursor = 0; writePrompt();
      } else if (code === 12) { // Ctrl+L
        term.clear(); writePrompt(); term.write(line);
      } else if (code >= 32 && code < 127) {
        line = line.slice(0, cursor) + ch + line.slice(cursor);
        cursor++;
        if (cursor === line.length) term.write(ch);
        else redraw();
      }
    }
  });
}
