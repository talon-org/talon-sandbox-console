/* SandboxRowMenu — 列表行尾「...」操作菜单。
 *
 * 替换原来那个没接 onClick 的假 more 按钮。把详情页已有的单条生命周期操作
 * (查看 / 启动 / 停止 / 暂停 / 删除)下沉到列表行内,让用户不进详情页也能操作。
 *
 * 设计:
 *   - 自包含 —— 自己持有生命周期 mutation 与销毁对话框状态,page 只渲染 <SandboxRowMenu s=.../>,
 *     不必为每行把 dialog state 提到列表层。
 *   - 状态机与详情页 1:1(见 PageSandboxDetail det-actions):
 *       running        → 暂停 / 停止
 *       paused/stopped → 启动
 *       running/paused/idle → 停止
 *     只渲染当前状态下合法的项,不给无效操作留入口。
 *   - 删除走与详情页同款 DestroySandboxDialog(三段式有摩擦:导出→输入完整 id→确认),
 *     单条删除是 developer+ 即可(后端单条 DELETE 不提权),故所有角色可见。
 *     批量删除才是 owner 专属(见 lib/permissions canBatchDestroySandboxes)。
 *   - 菜单项的 onSelect 用 stopPropagation 思路:Item 默认不冒泡到行的 onClick,
 *     但触发器按钮所在的 .actions 单元已 stopPropagation,双保险。
 */
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Button,
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent,
  DropdownMenuItem, DropdownMenuSeparator,
} from '@talon-sandbox/react';
import { TlnIcon } from '../../icons/TlnIcon';
import { useT } from '../../i18n/useT';
import { toast } from '../../components/Toast';
import { DestroySandboxDialog } from '../../components/DestroySandboxDialog';
import {
  useStartSandbox, useStopSandbox, usePauseSandbox, useDeleteSandbox,
} from '../../hooks';
import { exportWorkspace } from '../../api/sandboxes';
import type { SandboxDTO } from '../../api/types';

export function SandboxRowMenu({ s }: { s: SandboxDTO }) {
  const t   = useT();
  const nav = useNavigate();
  const start = useStartSandbox();
  const stop  = useStopSandbox();
  const pause = usePauseSandbox();
  const del   = useDeleteSandbox();
  const [confirmKill, setConfirmKill] = useState(false);

  const busy = start.isPending || stop.isPending || pause.isPending;

  // 状态机:与详情页 det-actions 完全一致。
  const canStart = s.state === 'paused' || s.state === 'stopped';
  const canPause = s.state === 'running';
  const canStop  = s.state === 'running' || s.state === 'paused' || s.state === 'idle';

  // 跑一个单条生命周期操作 + toast 反馈。失败给 error toast,成功静默(列表会自动刷新)。
  const run = (
    m: { mutate: (id: string, opts?: { onError?: (e: unknown) => void }) => void },
  ) => m.mutate(s.id, {
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : String(e)),
  });

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" iconOnly aria-label={t('sbx.row.actions', 'Actions')} disabled={busy}>
            <TlnIcon name="more" size={14} />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" sideOffset={4}>
          <DropdownMenuItem onSelect={() => nav('/sandboxes/' + s.id)}>
            <TlnIcon name="eye" size={13} /> {t('sbx.row.view', 'View details')}
          </DropdownMenuItem>
          {(canStart || canPause || canStop) && <DropdownMenuSeparator />}
          {canStart && (
            <DropdownMenuItem onSelect={() => run(start)}>
              <TlnIcon name="play" size={13} /> {t('common.start')}
            </DropdownMenuItem>
          )}
          {canPause && (
            <DropdownMenuItem onSelect={() => run(pause)}>
              <TlnIcon name="pause" size={13} /> {t('common.pause')}
            </DropdownMenuItem>
          )}
          {canStop && (
            <DropdownMenuItem onSelect={() => run(stop)}>
              <TlnIcon name="stop" size={13} /> {t('common.stop')}
            </DropdownMenuItem>
          )}
          <DropdownMenuSeparator />
          <DropdownMenuItem variant="danger" onSelect={() => setConfirmKill(true)}>
            <TlnIcon name="trash" size={13} /> {t('common.kill')}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* 单条销毁:与详情页同款三段式有摩擦对话框。 */}
      <DestroySandboxDialog
        open={confirmKill}
        sandboxId={s.id}
        onClose={() => setConfirmKill(false)}
        loading={del.isPending}
        onExport={() => exportWorkspace(s.id)}
        onConfirm={() => {
          del.mutate(s.id, {
            onSuccess: () => {
              setConfirmKill(false);
              toast.success(t('sbx.row.deleted', 'Sandbox deleted'));
            },
            onError: (e) => toast.error(e instanceof Error ? e.message : String(e)),
          });
        }}
      />
    </>
  );
}
