/* PageTerminal — full-bleed PTY terminal page.
 * Uses @talon-sandbox/react TerminalChrome as the visual frame.
 * xterm.js wiring lives in TerminalBody (extracted subcomponent).
 * WebSocket via sandboxPtyUrl(id) from src/api/sandboxes.ts.
 * Sandbox metadata from useSandbox(id).
 */
import { useState, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { TerminalChrome, Button } from '@talon-sandbox/react';
import { useT } from '../i18n/useT';
import { TlnIcon } from '../icons/TlnIcon';
import { useSandbox } from '../hooks';
import { TerminalBody } from './TerminalBody';

import './PageTerminal.css';

export function PageTerminal() {
  const { id }  = useParams<{ id: string }>();
  const nav     = useNavigate();
  const t       = useT();

  const sandboxId = id ?? '';
  const { data: sandbox } = useSandbox(sandboxId);

  const [recording,  setRecording]  = useState(false);
  const [cols,       setCols]       = useState(80);
  const [rows,       setRows]       = useState(24);
  const [connected,  setConnected]  = useState(false);
  const [connectKey, setConnectKey] = useState(0);

  const reconnect = useCallback(() => setConnectKey(k => k + 1), []);

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

  return (
    <TerminalChrome
      sandbox={{ id: sandboxId, name: sandbox?.profile }}
      onBack={() => nav('/sandboxes/' + sandboxId)}
      recording={recording}
      onToggleRecord={() => setRecording(r => !r)}
      topActions={
        <>
          {!connected && (
            <Button variant="ghost" size="sm" onClick={reconnect}>
              <TlnIcon name="refresh" size={14} />
              {t('term.reconnect')}
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
        </>
      }
      bottomStatus={bottomStatus}
      className="term-page"
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
