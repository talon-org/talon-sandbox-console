/* TerminalChrome — terminal page visual wrapper shell.
 * 1:1 port of page-terminal.jsx prototype structure.
 * Provides: topbar (back, sandbox id, status, actions) + body + status-bar.
 * xterm/WebSocket wiring lives in parent — this is the visual frame only.
 */
import type { ReactNode } from 'react';
import './TerminalChrome.css';

export interface TerminalChromeProps {
  /** Sandbox id displayed in top bar */
  sandboxId: string;
  /** Optional sandbox display name / profile */
  sandboxName?: string;
  /** Back button handler */
  onBack?: () => void;
  /** Whether a recording is active */
  recording?: boolean;
  /** Recording action handler (stop when active). 省略则不渲染录像按钮。 */
  onToggleRecord?: () => void;
  /** 录像按钮文案(走父组件 i18n)。active 态显示「录像中」,非 active 显示「录像」。
   *  不传时回退为内置英文,保持旧调用方兼容。 */
  recordLabel?: string;
  recordingLabel?: string;
  /** 录像按钮是否禁用(已手动停止后置灰,不再可点)。 */
  recordDisabled?: boolean;
  /** hover 提示(如「停止录像」)。 */
  recordTitle?: string;
  /** Extra actions on the right side of the top bar */
  topActions?: ReactNode;
  /** Status bar content (rendered below terminal body) */
  bottomStatus?: ReactNode;
  /** Terminal content (xterm mount target) */
  children: ReactNode;
  className?: string;
}

export function TerminalChrome({
  sandboxId,
  sandboxName,
  onBack,
  recording = false,
  onToggleRecord,
  recordLabel,
  recordingLabel,
  recordDisabled = false,
  recordTitle,
  topActions,
  bottomStatus,
  children,
  className,
}: TerminalChromeProps) {
  return (
    <div className={'term-page' + (className ? ' ' + className : '')}>
      {/* Top bar */}
      <div className="term-chrome-top">
        {onBack && (
          <button type="button" className="term-back" onClick={onBack}>
            ← {sandboxId}
          </button>
        )}

        <div className="term-info">
          <span className="dot" aria-hidden="true" />
          <span className="tid">{sandboxId}</span>
          {sandboxName && (
            <>
              <span className="tsep" aria-hidden="true">·</span>
              <span className="tname">{sandboxName}</span>
            </>
          )}
        </div>

        <div className="term-top-actions">
          {onToggleRecord && (
            <button
              type="button"
              className={'rec-btn' + (recording ? ' on' : '')}
              onClick={onToggleRecord}
              disabled={recordDisabled}
              title={recordTitle}
            >
              <span className="rdot" />
              {recording
                ? (recordingLabel ?? 'Recording')
                : (recordLabel ?? 'Record')}
            </button>
          )}
          {topActions}
        </div>
      </div>

      {/* Terminal body — xterm mounts here */}
      <div className="term-body">
        {children}
      </div>

      {/* Status bar */}
      {bottomStatus && (
        <div className="term-chrome-bot">
          {bottomStatus}
        </div>
      )}
    </div>
  );
}
