/* src/pages/_images/CreateImageDrawer.tsx
 * 注册镜像抽屉:name / url / sha256 / description / arch / default。
 *
 * sha256 自动抓取:url 失焦时尽力 fetch <url>.sha256 回填(GitHub release 资产
 * 通常允许跨域 GET)。失败静默,用户手填——绝不阻塞注册。仅当 sha256 字段为空
 * 或正是上次自动填入的值时才覆盖,避免抹掉用户手输。
 */
import { useState } from 'react';
import {
  Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerFooter,
  Button, Input, Textarea, toast,
  FormField, FormLabel, FormControl, FormDescription, FormSection,
} from '@talon-sandbox/react';
import { useT } from '../../i18n/useT';
import { TlnIcon } from '../../icons/TlnIcon';
import { useCreateImage } from '../../hooks/useImages';
import { probeImage, archFromUrl } from '../../api/images';
import type { CreateImageRequest } from '../../api/types';

interface Props {
  open: boolean;
  onClose: () => void;
}

const SHA_RE = /^[a-f0-9]{64}$/;

export function CreateImageDrawer({ open, onClose }: Props) {
  const t = useT();
  const createMutation = useCreateImage();

  const [name,    setName]    = useState('');
  const [url,     setUrl]     = useState('');
  const [sha256,  setSha256]  = useState('');
  const [desc,    setDesc]    = useState('');
  const [isDef,   setIsDef]   = useState(false);
  // 记录上次自动填入的 sha,以便 url 变更时安全覆盖而不抹掉手输
  const [autoSha,  setAutoSha]  = useState('');
  const [fetching, setFetching] = useState(false);

  // arch 从 url 文件名派生(os 当前所有产物都是 linux,焊死)。不让人手填。
  const arch = archFromUrl(url);

  const shaValid  = SHA_RE.test(sha256);
  const urlValid  = /^https:\/\/.+/.test(url.trim());
  const nameValid = name.trim().length > 0;
  const valid     = nameValid && urlValid && shaValid;
  const busy      = createMutation.isPending;

  const reset = () => {
    setName(''); setUrl(''); setSha256(''); setDesc('');
    setIsDef(false); setAutoSha('');
  };

  // url 失焦:走服务端 probe 代理读 <url>.sha256(浏览器跨域抓 github 会被 CORS 拦)。
  // 只在 sha 为空或等于上次自动值时覆盖,不抹用户手输;失败静默,用户手填。
  const handleUrlBlur = async () => {
    const u = url.trim();
    if (!/^https:\/\/.+\.tar\.gz$/.test(u)) return;
    if (sha256 && sha256 !== autoSha) return; // 用户已手输,不动
    setFetching(true);
    const probed = await probeImage(u).catch(() => null);
    setFetching(false);
    if (probed?.sha256 && /^[a-f0-9]{64}$/.test(probed.sha256)) {
      setSha256(probed.sha256);
      setAutoSha(probed.sha256);
    }
  };

  const handleCreate = () => {
    if (!valid || busy) return;
    const req: CreateImageRequest = {
      name: name.trim(),
      url: url.trim(),
      sha256: sha256.trim().toLowerCase(),
      os: 'linux',
      arch,  // 从 url 派生,见上
      ...(desc.trim() ? { description: desc.trim() } : {}),
      ...(isDef ? { is_default: true } : {}),
    };
    createMutation.mutate(req, {
      onSuccess: () => {
        toast.success(req.name + ' — ' + t('images.createSuccess'));
        reset();
        onClose();
      },
      onError: (err) => {
        // 后端把可读原因放在 body(如重名 409 / 校验 400),直接透出给超管
        const msg = err instanceof Error && err.message ? err.message : t('common.loadFailed');
        toast.error(req.name + ' — ' + msg);
      },
    });
  };

  const shaJustAutofilled = !!sha256 && sha256 === autoSha && shaValid;

  const drawerTitle = (
    <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <TlnIcon name="image" size={16} style={{ color: 'var(--info)' }} />
      {t('images.create.title')}
    </span>
  );

  return (
    <Drawer open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DrawerContent side="right" style={{ width: 540 }}>
        <DrawerHeader>
          <DrawerTitle>{drawerTitle}</DrawerTitle>
        </DrawerHeader>

        <div className="tln-drawer-body">
          <FormSection icon={<TlnIcon name="image" size={14} />} title={t('images.create.identity')}>
            <FormField error={name.length > 0 && !nameValid ? true : undefined}>
              <FormLabel htmlFor="img-name">{t('images.field.nameLabel')}</FormLabel>
              <FormControl>
                <Input
                  id="img-name"
                  mono
                  value={name}
                  onChange={e => setName(e.target.value.trim())}
                  placeholder={t('images.field.namePlaceholder')}
                />
              </FormControl>
              <FormDescription>{t('images.field.nameHint')}</FormDescription>
            </FormField>
          </FormSection>

          <FormSection icon={<TlnIcon name="download" size={14} />} title={t('images.create.artifact')}>
            <FormField error={url.length > 0 && !urlValid ? true : undefined}>
              <FormLabel htmlFor="img-url">{t('images.field.urlLabel')}</FormLabel>
              <FormControl>
                <Input
                  id="img-url"
                  mono
                  value={url}
                  onChange={e => setUrl(e.target.value)}
                  onBlur={handleUrlBlur}
                  placeholder={t('images.field.urlPlaceholder')}
                />
              </FormControl>
              <FormDescription>{t('images.field.urlHint')}</FormDescription>
              {urlValid && (
                <div className="img-detected">
                  <TlnIcon name="check" size={12} />
                  {t('images.field.detected')}
                  <span className="img-detected-val">linux / {arch}</span>
                </div>
              )}
            </FormField>

            <FormField error={sha256.length > 0 && !shaValid ? true : undefined}>
              <FormLabel htmlFor="img-sha">{t('images.field.sha256Label')}</FormLabel>
              <FormControl>
                <Input
                  id="img-sha"
                  mono
                  value={sha256}
                  onChange={e => { setSha256(e.target.value.trim().toLowerCase()); }}
                  placeholder={t('images.field.sha256Placeholder')}
                  trailingIcon={fetching ? <TlnIcon name="refresh" size={13} style={{ color: 'var(--fg-3)' }} /> : undefined}
                />
              </FormControl>
              <FormDescription>
                {sha256.length > 0 && !shaValid
                  ? t('images.field.sha256Invalid')
                  : shaJustAutofilled
                    ? t('images.field.sha256Fetched')
                    : t('images.field.sha256Hint')}
              </FormDescription>
            </FormField>

            <FormField>
              <FormLabel htmlFor="img-desc">{t('images.field.descLabel')}</FormLabel>
              <FormControl>
                <Textarea
                  id="img-desc"
                  value={desc}
                  onChange={e => setDesc(e.target.value)}
                  placeholder={t('images.field.descPlaceholder')}
                  rows={2}
                />
              </FormControl>
            </FormField>

            <FormField>
              <label className="img-default-toggle">
                <input type="checkbox" checked={isDef} onChange={e => setIsDef(e.target.checked)} />
                <span>{t('images.field.defaultLabel')}</span>
              </label>
              <FormDescription>{t('images.field.defaultHint')}</FormDescription>
            </FormField>
          </FormSection>
        </div>

        <DrawerFooter>
          <div className="right">
            <Button variant="ghost" onClick={onClose}>{t('common.cancel')}</Button>
            <Button variant="primary" disabled={!valid || busy} loading={busy} onClick={handleCreate}>
              <TlnIcon name="check" size={14} />
              {t('images.create.submit')}
            </Button>
          </div>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
