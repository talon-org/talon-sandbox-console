/* src/components/DestroySandboxDialog.tsx
 *
 * Destroy 是不可逆的:后端 DELETE /v1/sandboxes/{id} 会永久删除 workspace
 * (LocalBackend rm -rf / NFSBackend .trash)。普通 ConfirmDialog 的一键确认对
 * 这种"删数据"操作太轻——所以这里把销毁做成一个有摩擦的三段式决策:
 *
 *   1. 数据导出区:醒目提示"销毁会永久删数据" + 一键导出整个 workspace 为
 *      tar.gz。导出独立于销毁(不改 sandbox),用户可以只导出不销毁。
 *   2. type-to-confirm:必须把完整 sandbox id 一字不差敲进输入框,销毁按钮才
 *      解锁。防误点、强制用户确认到底在销毁哪一个。
 *   3. 销毁按钮永远是 filled danger,与"取消"在视觉上拉开。
 *
 * 设计成可复用组件(列表页批量销毁 / 详情页销毁都能用),而不是塞进某个 page。
 * 导出与销毁的副作用由 caller 通过回调注入,组件本身只管交互编排与摩擦。
 */
import { useEffect, useState } from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
  Button, Input,
} from '@talon-sandbox/react';
import { TlnIcon } from '../icons/TlnIcon';
import { useT } from '../i18n/useT';
import './DestroySandboxDialog.css';

interface DestroySandboxDialogProps {
  open: boolean;
  /** 目标 sandbox id —— 既是 type-to-confirm 的比对基准,也是导出/销毁的目标。 */
  sandboxId: string;
  onClose: () => void;
  /** 执行销毁;caller 负责调后端 + 成功后导航。组件在调用期间显示 loading。 */
  onConfirm: () => void;
  /** 销毁中(由 caller 的 mutation pending 驱动)。 */
  loading?: boolean;
  /** 触发 workspace 导出;resolve 表示下载已开始,reject 表示导出失败。 */
  onExport: () => Promise<void>;
}

type ExportPhase = 'idle' | 'busy' | 'done' | 'error';

export function DestroySandboxDialog({
  open, sandboxId, onClose, onConfirm, loading, onExport,
}: DestroySandboxDialogProps) {
  const t = useT();
  const [typed, setTyped] = useState('');
  const [exportPhase, setExportPhase] = useState<ExportPhase>('idle');

  // 每次打开重置本地状态:避免上次输入的 id / 导出状态泄漏到下一次销毁。
  useEffect(() => {
    if (open) {
      setTyped('');
      setExportPhase('idle');
    }
  }, [open, sandboxId]);

  const idMatches = typed.trim() === sandboxId;
  const showMismatch = typed.length > 0 && !idMatches;

  async function handleExport() {
    setExportPhase('busy');
    try {
      await onExport();
      setExportPhase('done');
    } catch {
      setExportPhase('error');
    }
  }

  function exportButtonLabel(): string {
    switch (exportPhase) {
      case 'busy': return t('sbx.kill.export.busy');
      case 'done': return t('sbx.kill.export.again');
      default:     return t('sbx.kill.export.btn');
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o && !loading) onClose(); }}>
      <DialogContent className="destroy-dialog">
        <DialogHeader>
          <DialogTitle>
            <span className="destroy-dialog-title">
              <span>{t('sbx.kill.title')}</span>
              <span className="destroy-dialog-id" title={sandboxId}>{sandboxId}</span>
            </span>
          </DialogTitle>
        </DialogHeader>

        <p className="destroy-dialog-warn">{t('sbx.kill.body')}</p>

        {/* 1) 数据导出区 —— 销毁前的逃生舱口 */}
        <div className="destroy-export">
          <div className="destroy-export-text">
            <div className="destroy-export-head">
              <TlnIcon name="download" size={14} />
              {t('sbx.kill.export.head')}
            </div>
            <div className="destroy-export-desc">{t('sbx.kill.export.desc')}</div>
            {exportPhase === 'done' && (
              <div className="destroy-export-status ok">
                <TlnIcon name="check" size={13} /> {t('sbx.kill.export.done')}
              </div>
            )}
            {exportPhase === 'error' && (
              <div className="destroy-export-status err">{t('sbx.kill.export.fail')}</div>
            )}
          </div>
          <Button
            variant="default"
            onClick={handleExport}
            loading={exportPhase === 'busy'}
            disabled={exportPhase === 'busy'}
          >
            {exportButtonLabel()}
          </Button>
        </div>

        {/* 2) type-to-confirm —— 输入完整 id 才解锁销毁 */}
        <div className="destroy-confirm">
          <label className="destroy-confirm-label" htmlFor="destroy-confirm-input">
            {t('sbx.kill.confirmLabel')}
          </label>
          <div className="destroy-confirm-hint">{t('sbx.kill.confirmHint')}</div>
          <Input
            id="destroy-confirm-input"
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
            placeholder={sandboxId}
            autoComplete="off"
            spellCheck={false}
            mono
            error={showMismatch}
            className="destroy-confirm-input"
            disabled={loading}
          />
          {showMismatch && (
            <div className="destroy-confirm-mismatch">{t('sbx.kill.idMismatch')}</div>
          )}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={onClose} disabled={loading}>
            {t('common.cancel')}
          </Button>
          <Button
            variant="danger"
            className="destroy-dialog-danger"
            onClick={onConfirm}
            loading={loading}
            disabled={!idMatches || loading}
          >
            {t('sbx.kill.confirm')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
