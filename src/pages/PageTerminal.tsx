/* PageTerminal — full-bleed PTY terminal page.
 * Shell: TerminalChrome local business component (topbar + body + status-bar).
 * xterm.js wiring lives in TerminalBody (extracted subcomponent).
 * WebSocket via sandboxPtyUrl(id) from src/api/sandboxes.ts.
 * Sandbox metadata from useSandbox(id).
 */
import { useState, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '@talon-sandbox/react';
import { useT } from '../i18n/useT';
import { TlnIcon } from '../icons/TlnIcon';
import { useSandbox } from '../hooks';
import { TerminalBody } from './TerminalBody';
import { TerminalChrome } from '../components/TerminalChrome';

import './PageTerminal.css';

export function PageTerminal() {
  const { id } = useParams<{ id: string }>();
  const nav    = useNavigate();
  const t      = useT();

  const sandboxId = id ?? '';
  const { data: sandbox } = useSandbox(sandboxId);

  const [recording,  setRecording]  = useState(false);
  const [cols,       setCols]       = useState(80);
  const [rows,       setRows]       = useState(24);
  const [connected,  setConnected]  = useState(false);
  const [connectKey, setConnectKey] = useState(0);

  const reconnect = useCallback(() => setConnectKey(k => k + 1), []);

  // Status bar content for the bottom chrome strip
  const bottomStatus = (
    <div className="term-bot-status">
      <span className="bleft">
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10.5 }}>
          {sandbox?.image_id ?? ''}
        </span>
      </span>
      <span className="bright">
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10.5 }}>
          {t('term.utf8')}
        </span>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10.5 }}>
          {cols} × {rows}
        </span>
        <span
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 10.5,
            color: connected ? 'var(--ok)' : 'var(--err)',
          }}
        >
          {connected ? t('term.connected') : t('term.disconnected')}
        </span>
      </span>
    </div>
  );

  // Top-bar action buttons。
  // 仅保留「重连」(断线时出现)这一真实操作。原先的「新建 Shell / Detach / More」
  // 均无后端支撑:当前 PTY 是单会话 WebSocket 模型,不支持多 shell,关闭即断连无
  // 后台保活(detach 无意义),More 也无菜单内容——故移除,不保留死按钮。
  const topActions = !connected ? (
    <Button variant="ghost" size="sm" onClick={reconnect}>
      <TlnIcon name="refresh" size={14} />
      {t('term.reconnect')}
    </Button>
  ) : null;

  return (
    <TerminalChrome
      sandboxId={sandboxId}
      sandboxName={sandbox?.profile}
      onBack={() => nav('/sandboxes/' + sandboxId)}
      recording={recording}
      onToggleRecord={() => setRecording(r => !r)}
      topActions={topActions}
      bottomStatus={bottomStatus}
    >
      <TerminalBody
        sandboxId={sandboxId}
        connectKey={connectKey}
        onConnected={setConnected}
        onDimensions={(c, r) => { setCols(c); setRows(r); }}
      />
    </TerminalChrome>
  );
}
