/* PageImages — 超管:基础镜像目录管理。
 * 列表 + 注册抽屉 + 设默认 + 预热(行内轮询进度) + 删除确认。
 * Data: useImages() / useSetDefaultImage() / useDeleteImage() from src/hooks/useImages.ts
 *
 * 后端契约见 agent-sandbox-platform internal/api/http/image_handlers.go:
 *   GET  /v1/images                      列表(超管看到 url/source 全字段)
 *   POST /v1/admin/images                注册
 *   POST /v1/admin/images/{id}/default   设默认
 *   POST /v1/admin/images/{id}/prewarm   预热(异步,行内轮询 /v1/images/{id}/status)
 *   DELETE /v1/admin/images/{id}         删除(builtin 返 403)
 */
import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Button, PageHeader, toast } from '@talon-sandbox/react';
import { useT } from '../i18n/useT';
import { TlnIcon } from '../icons/TlnIcon';
import { useImages, useSetDefaultImage, useDeleteImage } from '../hooks/useImages';
import { EmptyState, ConfirmDialog } from '../components';
import { CreateImageDrawer } from './_images/CreateImageDrawer';
import { ImageRow } from './_images/ImageRow';
import type { ImageDTO } from '../api/types';

import './PageImages.css';

export function PageImages() {
  const t = useT();
  const [searchParams] = useSearchParams();
  const [drawer,       setDrawer]       = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<ImageDTO | null>(null);

  const { data, isLoading, isError, error } = useImages();
  const setDefaultMutation = useSetDefaultImage();
  const deleteMutation     = useDeleteImage();

  useEffect(() => {
    if (searchParams.get('new') === '1') setDrawer(true);
  }, [searchParams]);

  const images = data?.images ?? [];

  const handleSetDefault = (img: ImageDTO) => {
    setDefaultMutation.mutate(img.id, {
      onSuccess: () => toast.success(img.name + ' — ' + t('images.setDefaultSuccess')),
      onError:   () => toast.error(img.name + ' — ' + t('common.loadFailed')),
    });
  };

  const handleDeleteConfirm = () => {
    if (!deleteTarget) return;
    const { id, name } = deleteTarget;
    setDeleteTarget(null);
    deleteMutation.mutate(id, {
      onSuccess: () => toast.success(name + ' — ' + t('images.deleteSuccess')),
      onError: (err) => {
        const msg = err instanceof Error && err.message ? err.message : t('common.loadFailed');
        toast.error(name + ' — ' + msg);
      },
    });
  };

  return (
    <>
      <PageHeader
        title={t('images.title')}
        num={String(images.length)}
        desc={t('images.desc')}
        actions={
          <Button variant="primary" onClick={() => setDrawer(true)}>
            <TlnIcon name="plus" size={14} />
            {t('images.create.title')}
          </Button>
        }
      />

      <div className="page-body">
        {isLoading && <EmptyState variant="loading" title={t('common.loading')} />}
        {isError   && <EmptyState variant="error"   error={error} />}

        {!isLoading && !isError && (
          <div className="tln-tbl">
            <div className="tln-tbl-head img-row">
              <div>{t('images.colName')}</div>
              <div>{t('images.colSource')}</div>
              <div>{t('images.colArch')}</div>
              <div>{t('images.colStatus')}</div>
              <div>{t('images.colCreated')}</div>
              <div />
            </div>

            {images.map(img => (
              <ImageRow
                key={img.id}
                image={img}
                onSetDefault={handleSetDefault}
                onDelete={setDeleteTarget}
                setDefaultPending={setDefaultMutation.isPending}
              />
            ))}

            {images.length === 0 && (
              <div style={{ padding: 32 }}>
                <EmptyState
                  icon={<TlnIcon name="image" size={24} />}
                  title={t('images.empty.head')}
                  description={t('images.empty.desc')}
                  action={
                    <Button variant="primary" onClick={() => setDrawer(true)}>
                      <TlnIcon name="plus" size={14} />
                      {t('images.create.title')}
                    </Button>
                  }
                />
              </div>
            )}
          </div>
        )}
      </div>

      <CreateImageDrawer open={drawer} onClose={() => setDrawer(false)} />

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDeleteConfirm}
        title={
          <>
            {t('images.deleteTitle')}&nbsp;
            <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--magenta, #c678dd)' }}>
              {deleteTarget?.name}
            </span>
          </>
        }
        description={t('images.deleteBody')}
        confirmLabel={t('images.deleteConfirm')}
        loading={deleteMutation.isPending}
        danger
      />
    </>
  );
}
