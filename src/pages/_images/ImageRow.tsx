/* src/pages/_images/ImageRow.tsx
 * 镜像列表行:名称/来源/系统架构/状态/创建时间 + 行内操作。
 *
 * 预热:点「预热」→ POST prewarm(202)→ 本行进入轮询态,useImageStatus 每 2.5s
 * 拉一次 status,行内渲染阶段 + 字节进度条,到 ready/failed 停止。轮询只在本行
 * 被预热过(armed=true)时启用,避免每行常驻轮询打爆后端。
 */
import { useState } from 'react';
import { Button, ProgressBar, toast } from '@talon-sandbox/react';
import { useT } from '../../i18n/useT';
import { TlnIcon } from '../../icons/TlnIcon';
import { useImageStatus, usePrewarmImage } from '../../hooks/useImages';
import type { ImageDTO, ImageStage } from '../../api/types';

interface Props {
  image: ImageDTO;
  onSetDefault: (img: ImageDTO) => void;
  onDelete: (img: ImageDTO) => void;
  setDefaultPending: boolean;
}

function relTime(sec: number): string {
  const d = Math.max(0, Math.round(Date.now() / 1000 - sec));
  if (d < 60)    return `${d}s`;
  if (d < 3600)  return `${Math.floor(d / 60)}m`;
  if (d < 86400) return `${Math.floor(d / 3600)}h`;
  return `${Math.floor(d / 86400)}d`;
}

function fmtBytes(n: number): string {
  if (n <= 0) return '0';
  const u = ['B', 'KB', 'MB', 'GB'];
  let i = 0; let v = n;
  while (v >= 1024 && i < u.length - 1) { v /= 1024; i++; }
  return `${v.toFixed(v < 10 && i > 0 ? 1 : 0)}${u[i]}`;
}

const ACTIVE_STAGES: ImageStage[] = ['pending', 'downloading', 'verifying', 'extracting'];

export function ImageRow({ image, onSetDefault, onDelete, setDefaultPending }: Props) {
  const t = useT();
  const prewarm = usePrewarmImage();

  // armed:本会话内对该镜像点过预热,开始轮询其 status。
  const [armed, setArmed] = useState(false);
  const { data: status } = useImageStatus(image.id, armed);

  const stage = status?.stage;
  const isActive = stage != null && ACTIVE_STAGES.includes(stage);
  const isBuiltin = image.source === 'builtin';

  const handlePrewarm = () => {
    setArmed(true);
    prewarm.mutate(image.id, {
      onSuccess: () => toast.success(image.name + ' — ' + t('images.prewarmStarted')),
      onError: () => { setArmed(false); toast.error(image.name + ' — ' + t('common.loadFailed')); },
    });
  };

  // 状态单元:优先显示轮询到的实时阶段;否则中性占位。
  const renderStatus = () => {
    if (!stage || stage === 'unknown') {
      return <span className="img-stage muted">{t('images.stage.notReady')}</span>;
    }
    if (stage === 'ready') {
      return <span className="img-stage ok">● {t('images.stage.ready')}</span>;
    }
    if (stage === 'failed') {
      return (
        <span className="img-stage err" title={status?.err || undefined}>
          ○ {t('images.stage.failed')}
        </span>
      );
    }
    // 进行中:阶段标签 + 进度条。ProgressBar value 是 0..100 百分比。
    // 仅 downloading 且 bytes_total 已知时给确定进度,其余阶段(verifying/extracting/
    // bytes_total=-1)用 indeterminate 动画。
    const total = status?.bytes_total ?? -1;
    const done  = status?.bytes_downloaded ?? 0;
    const pct   = total > 0 ? Math.min(100, Math.round((done / total) * 100)) : 0;
    const determinate = stage === 'downloading' && total > 0;
    return (
      <div className="img-progress">
        <span className="img-stage active">{t(`images.stage.${stage}`)}</span>
        {determinate ? (
          <>
            <ProgressBar value={pct} />
            <span className="img-bytes">{fmtBytes(done)} / {fmtBytes(total)}</span>
          </>
        ) : (
          <ProgressBar indeterminate />
        )}
      </div>
    );
  };

  return (
    <div className="tln-tbl-row img-row">
      {/* 名称 */}
      <div className="name-cell">
        <div className="iic"><TlnIcon name="image" size={14} /></div>
        <div className="iinfo">
          <span className="inm">
            {image.name}
            {image.is_default && <span className="img-default-badge">{t('images.isDefault')}</span>}
          </span>
          {image.description && <span className="idesc">{image.description}</span>}
        </div>
      </div>

      {/* 来源 */}
      <div>
        <span className={`img-source ${image.source}`}>
          {isBuiltin ? t('images.sourceBuiltin') : t('images.sourceAdmin')}
        </span>
      </div>

      {/* 系统 / 架构 */}
      <div className="img-arch">{image.os} / {image.arch}</div>

      {/* 状态 */}
      <div>{renderStatus()}</div>

      {/* 创建时间 */}
      <div className="img-created">{relTime(image.created_at)}</div>

      {/* 操作 */}
      <div className="actions">
        {!image.is_default && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onSetDefault(image)}
            disabled={setDefaultPending}
            title={t('images.setDefault')}
          >
            {t('images.setDefault')}
          </Button>
        )}
        <Button
          variant="ghost"
          size="sm"
          onClick={handlePrewarm}
          disabled={prewarm.isPending || isActive}
          loading={prewarm.isPending}
          title={t('images.prewarm')}
        >
          <TlnIcon name="flame" size={13} />
          {t('images.prewarm')}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          iconOnly
          onClick={() => onDelete(image)}
          disabled={isBuiltin}
          title={isBuiltin ? t('images.builtinLocked') : t('images.delete')}
          aria-label={t('images.delete')}
        >
          <TlnIcon name="trash" size={13} />
        </Button>
      </div>
    </div>
  );
}
