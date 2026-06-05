/* PageTerminal — full-bleed PTY terminal page.
 * Shell: TerminalChrome local business component (topbar + body + status-bar).
 * xterm.js wiring lives in TerminalBody (extracted subcomponent).
 * WebSocket via sandboxPtyUrl(id) from src/api/sandboxes.ts.
 * Sandbox metadata from useSandbox(id).
 */
import { useState, useCallback, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '@talon-sandbox/react';
import { useT } from '../i18n/useT';
import { TlnIcon } from '../icons/TlnIcon';
import { useSandbox } from '../hooks';
import { startRecording, stopRecording } from '../api/recordings';
import { TerminalBody } from './TerminalBody';
import { TerminalChrome } from '../components/TerminalChrome';

import './PageTerminal.css';

export function PageTerminal() {
  const { id } = useParams<{ id: string }>();
  const nav    = useNavigate();
  const t      = useT();

  const sandboxId = id ?? '';
  const { data: sandbox } = useSandbox(sandboxId);

  const [cols,       setCols]       = useState(80);
  const [rows,       setRows]       = useState(24);
  const [connected,  setConnected]  = useState(false);
  const [connectKey, setConnectKey] = useState(0);

  // 录像状态:
  // - recording=true 表示本会话已在中心录像库登记且仍在录。
  // - userStopped=true 表示用户手动停过录像,断开后再重连不自动重新登记
  //   (避免「停了又自己起来」的反直觉行为);点「重连」会重置该标记。
  const [recording,  setRecording]  = useState(false);
  const [userStopped, setUserStopped] = useState(false);
  // 防并发/重复登记:start 在飞行中或已成功时不再重复发起。
  const startingRef = useRef(false);

  const reconnect = useCallback(() => {
    setUserStopped(false);   // 重连视为重新开始一次会话,允许再次自动录像
    setConnectKey(k => k + 1);
  }, []);

  // shell 连上(WebSocket open / connected=true)即把会话登记到中心录像库。
  // 后端 OpenPTY 本就无条件落盘录像,这里的 start 只是把这次会话写进中心
  // 录像索引,让后台「录像」页能查到;断开 / 卸载时调 stop 收尾。
  useEffect(() => {
    if (!sandboxId || !connected || recording || userStopped || startingRef.current) return;
    startingRef.current = true;
    let cancelled = false;
    startRecording(sandboxId)
      .then(() => { if (!cancelled) setRecording(true); })
      .catch(() => { /* 登记失败不阻断终端使用;后端仍在落盘 */ })
      .finally(() => { startingRef.current = false; });
    return () => { cancelled = true; };
  }, [sandboxId, connected, recording, userStopped]);

  // 断开 / 离开页面时停止中心录像登记。仅在「正在录」时发 stop。
  useEffect(() => {
    if (connected || !recording) return;
    stopRecording(sandboxId).catch(() => { /* 收尾失败忽略 */ });
    setRecording(false);
  }, [connected, recording, sandboxId]);

  // 卸载兜底:页面退出时确保 stop 一次(用 ref 读最新状态,避免闭包过期)。
  const recordingRef = useRef(recording);
  recordingRef.current = recording;
  useEffect(() => {
    return () => {
      if (recordingRef.current) stopRecording(sandboxId).catch(() => {});
    };
  }, [sandboxId]);

  // 「录像」按钮:连接后为状态指示(录像中),点击手动停止中心录像登记。
  const onToggleRecord = useCallback(() => {
    if (!recording) return;            // 非录制态不做事(不再是无意义 toggle)
    setRecording(false);
    setUserStopped(true);
    stopRecording(sandboxId).catch(() => {});
  }, [recording, sandboxId]);

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
      onToggleRecord={onToggleRecord}
      recordLabel={userStopped ? t('term.recStopped') : t('term.record')}
      recordingLabel={t('term.recording')}
      recordDisabled={!recording}
      recordTitle={recording ? t('term.stopRecord') : undefined}
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
