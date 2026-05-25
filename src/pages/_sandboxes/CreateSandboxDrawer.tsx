/* _sandboxes/CreateSandboxDrawer.tsx — create sandbox drawer form */
import { useState, useId, useEffect } from 'react';
import { Drawer, Button, Input, Select, Textarea, toast } from '@talon-sandbox/react';
import { useT } from '../../i18n/useT';
import { TlnIcon } from '../../icons/TlnIcon';
import { useCreateSandbox, useImages } from '../../hooks';
import { useSecrets } from '../../hooks';

interface CreateSandboxDrawerProps {
  open: boolean;
  onClose: () => void;
}

export function CreateSandboxDrawer({ open, onClose }: CreateSandboxDrawerProps) {
  const t      = useT();
  const cpuId  = useId();
  const memId  = useId();
  const diskId = useId();

  const [name,        setName]        = useState('');
  // image 现在存的是 ImageDTO.id（短码),不再是 name 字符串。空字符串 = 让后端选默认。
  const [image,       setImage]       = useState('');
  const [cpu,         setCpu]         = useState(2);
  const [mem,         setMem]         = useState(4);
  const [disk,        setDisk]        = useState(8);
  const [policy,      setPolicy]      = useState<'allow-all' | 'allowlist' | 'block-all'>('allowlist');
  const [allowed,     setAllowed]     = useState('api.acme.dev\nregistry.npmjs.org\n*.github.com');
  const [selectedSec, setSelectedSec] = useState<string[]>([]);
  const [env,         setEnv]         = useState('');

  const create    = useCreateSandbox();
  const { data: secretsData } = useSecrets();
  const secrets   = secretsData?.secrets ?? [];

  // 拉可用 baseimage 列表(后端 seed/admin 添加的所有 image),drawer 打开时自动选 default。
  // 不让用户自由输入 image name —— 平台只识别 images 表里有的条目,自由输入必报错。
  const { data: imagesData, isLoading: imagesLoading, isError: imagesError } = useImages();
  const images = imagesData?.images ?? [];

  useEffect(() => {
    if (!image && images.length > 0) {
      const def = images.find(i => i.is_default) ?? images[0];
      setImage(def.id);
    }
  }, [images, image]);

  const estCost = (cpu * mem * 0.012).toFixed(3).slice(1);

  const handleLaunch = () => {
    const envRecord: Record<string, string> = {};
    for (const line of env.split('\n')) {
      const eq = line.indexOf('=');
      if (eq > 0) envRecord[line.slice(0, eq).trim()] = line.slice(eq + 1).trim();
    }
    const allowedHosts = policy === 'allowlist' ? allowed.split('\n').filter(Boolean) : undefined;
    create.mutate(
      {
        profile: name || undefined,
        image_id: image,
        resources: { cpu, memory: `${mem}GiB`, disk: `${disk}GiB` },
        network: policy === 'allow-all' ? 'open' : policy === 'block-all' ? 'sealed' : 'allowlist',
        env: Object.keys(envRecord).length ? envRecord : undefined,
        secrets: selectedSec.map(sid => ({ secret_id: sid, mount_type: 'env' as const, target: sid })),
      },
      {
        onSuccess: (sb) => {
          toast.success(`${t('sbx.creating')} ${sb.id}`);
          onClose();
        },
        onError: (err: unknown) => {
          const msg = err instanceof Error ? err.message : String(err);
          toast.error(msg);
        },
      },
    );
  };

  return (
    <Drawer
      open={open}
      onClose={onClose}
      side="right"
      width={580}
      title={<span style={{ display: 'flex', alignItems: 'center', gap: 8 }}><TlnIcon name="box" size={16} style={{ color: 'var(--acc)' }} />{t('sbx.create.title')}</span>}
    >
      {/* basics */}
      <div className="form-sect">
        <div className="form-sect-title"><TlnIcon name="box" size={14} className="ic" />{t('sbx.create.basics')}</div>
        <div className="form-grid">
          <div className="form-field">
            <label className="ff-label" htmlFor="csd-name">{t('sbx.create.name')}</label>
            <Input id="csd-name" value={name} onChange={e => setName(e.target.value)} placeholder={t('sbx.create.namePlaceholder')} />
          </div>
        </div>
        <div className="form-field">
          <label className="ff-label" htmlFor="csd-image">{t('sbx.colImage')}</label>
          <Select
            id="csd-image"
            mono
            value={image}
            onChange={e => setImage(e.target.value)}
            disabled={imagesLoading || imagesError || images.length === 0}
          >
            {imagesLoading && <option value="">{t('common.loading')}</option>}
            {imagesError && <option value="">{t('common.loadFailed')}</option>}
            {!imagesLoading && !imagesError && images.length === 0 && (
              <option value="">{t('sbx.create.noImages')}</option>
            )}
            {images.map(img => (
              <option key={img.id} value={img.id}>
                {img.name}{img.is_default ? ` (${t('sbx.create.defaultImage')})` : ''}
              </option>
            ))}
          </Select>
          {/* 显示当前选中 image 的描述,帮助用户判断是否合适 */}
          {(() => {
            const sel = images.find(i => i.id === image);
            return sel?.description ? (
              <div style={{ fontSize: 11, color: 'var(--fg-3)', marginTop: 4 }}>{sel.description}</div>
            ) : null;
          })()}
        </div>
      </div>

      {/* resources */}
      <div className="form-sect">
        <div className="form-sect-title">
          <TlnIcon name="cpu" size={14} className="ic" />{t('sbx.create.resources')}
          <span className="hint">{cpu} vCPU · {mem} GiB · {disk} GiB</span>
        </div>
        <div className="form-grid">
          <div className="form-field">
            <label className="ff-label" htmlFor={cpuId}>{t('sbx.create.vcpu')} <span style={{ fontFamily: 'var(--font-mono)', float: 'right' }}>{cpu}</span></label>
            <input id={cpuId} type="range" min={1} max={16} step={1} value={cpu} onChange={e => setCpu(+e.target.value)} style={{ width: '100%' }} />
          </div>
          <div className="form-field">
            <label className="ff-label" htmlFor={memId}>{t('sbx.create.memGib')} <span style={{ fontFamily: 'var(--font-mono)', float: 'right' }}>{mem}</span></label>
            <input id={memId} type="range" min={1} max={32} step={1} value={mem} onChange={e => setMem(+e.target.value)} style={{ width: '100%' }} />
          </div>
          <div className="form-field">
            <label className="ff-label" htmlFor={diskId}>{t('sbx.create.diskGib')} <span style={{ fontFamily: 'var(--font-mono)', float: 'right' }}>{disk}</span></label>
            <input id={diskId} type="range" min={4} max={64} step={4} value={disk} onChange={e => setDisk(+e.target.value)} style={{ width: '100%' }} />
          </div>
        </div>
      </div>

      {/* network */}
      <div className="form-sect">
        <div className="form-sect-title"><TlnIcon name="network" size={14} className="ic" />{t('sbx.create.network')}</div>
        <div className="policy-radio">
          {([
            { v: 'allow-all', title: t('sbx.create.allowAll'),    desc: t('sbx.create.allowAllDesc') },
            { v: 'allowlist', title: t('sbx.create.allowlist'),    desc: t('sbx.create.allowlistDesc') },
            { v: 'block-all', title: t('sbx.create.blockAll'),     desc: t('sbx.create.blockAllDesc') },
          ] as const).map(p => (
            <label key={p.v} data-active={policy === p.v}>
              <input type="radio" checked={policy === p.v} onChange={() => setPolicy(p.v)} />
              <div className="title">{p.title}</div>
              <div className="desc">{p.desc}</div>
            </label>
          ))}
        </div>
        {policy === 'allowlist' && (
          <div className="form-field">
            <label className="ff-label">{t('sbx.create.allowedHosts')}</label>
            <Textarea value={allowed} onChange={e => setAllowed(e.target.value)} rows={4} />
            <div className="ff-hint">{t('sbx.create.allowedHint')}</div>
          </div>
        )}
      </div>

      {/* secrets */}
      <div className="form-sect">
        <div className="form-sect-title">
          <TlnIcon name="key" size={14} className="ic" />{t('sbx.create.secrets')}
          <span className="hint">{t('sbx.create.secretsHint')}</span>
        </div>
        <div className="chip-multi">
          {selectedSec.map(sid => {
            const s = secrets.find(x => x.id === sid);
            return (
              <span key={sid} className="chip">
                {s?.name ?? sid}
                <TlnIcon name="x" size={10} className="x" onClick={() => setSelectedSec(prev => prev.filter(x => x !== sid))} />
              </span>
            );
          })}
          <Select
            size="sm"
            value=""
            onChange={e => {
              const v = e.target.value;
              if (v && !selectedSec.includes(v)) setSelectedSec(prev => [...prev, v]);
            }}
            style={{ minWidth: 0, flex: 1 }}
          >
            <option value="">{t('sbx.create.addSecret')}</option>
            {secrets.filter(s => !selectedSec.includes(s.id)).map(s => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </Select>
        </div>
      </div>

      {/* env vars */}
      <div className="form-sect">
        <div className="form-sect-title">
          <TlnIcon name="fileText" size={14} className="ic" />{t('sbx.create.env')}
          <span className="hint">{t('sbx.create.envHint')}</span>
        </div>
        <Textarea value={env} onChange={e => setEnv(e.target.value)} rows={3} />
      </div>

      {/* footer */}
      <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--line-soft)' }}>
        <div className="drawer-footer">
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--fg-3)' }}>
            {t('sbx.create.estimate')} · <span style={{ color: 'var(--fg-1)' }}>${estCost}/hr</span>
          </span>
          <div className="right">
            <Button variant="ghost" onClick={onClose}>{t('common.cancel')}</Button>
            <Button variant="primary" loading={create.isPending} disabled={create.isPending} onClick={handleLaunch}>
              <TlnIcon name="zap" size={14} />
              {t('sbx.create.launch')}
            </Button>
          </div>
        </div>
      </div>
    </Drawer>
  );
}
