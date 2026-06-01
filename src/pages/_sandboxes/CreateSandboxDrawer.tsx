/* _sandboxes/CreateSandboxDrawer.tsx — create sandbox drawer form */
import { useState, useEffect } from 'react';
import {
  Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerFooter,
  Button, Input, Textarea, toast,
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
  MultiSelect, MultiSelectTrigger, MultiSelectContent, MultiSelectItem, MultiSelectEmpty,
  Slider, SliderTrack, SliderRange, SliderThumb,
  FormField, FormLabel, FormControl, FormDescription, FormSection,
} from '@talon-sandbox/react';
import { useT } from '../../i18n/useT';
import { TlnIcon } from '../../icons/TlnIcon';
import { useCreateSandbox, useImages } from '../../hooks';
import { useSecrets } from '../../hooks';
import { useApp } from '../../store';

// 配额为 0(不限)或缺省时回退到的硬上限——给个合理的产品上界,而非无穷。
const FALLBACK_MAX = { cpu: 16, mem: 32, disk: 64 };
// clamp 到 [min, max]。
const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n));

import './CreateSandboxDrawer.css';

interface CreateSandboxDrawerProps {
  open: boolean;
  onClose: () => void;
}

// Cost model: vCPU * memGiB * $0.012/hr — formula stays visible so the user
// understands why bumping memory doubles the bill.
function estimatedCost(cpu: number, mem: number): string {
  return (cpu * mem * 0.012).toFixed(3).replace(/^0/, '');
}

// One resource row: tight 3-column grid (label · slider · value+unit).
// Label is mono micro-text, value is the visual focus.
function ResourceRow({
  label, value, min, max, step, unit, onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  unit: string;
  onChange: (n: number) => void;
}) {
  return (
    <div className="csd-res-row">
      <span className="csd-res-label">{label}</span>
      <Slider
        min={min}
        max={max}
        step={step}
        value={[value]}
        onValueChange={(vals) => onChange(vals[0] ?? value)}
        className="csd-res-slider"
      >
        <SliderTrack><SliderRange /></SliderTrack>
        <SliderThumb />
      </Slider>
      <span className="csd-res-val">
        <span className="num">{value}</span>
        <span className="unit">{unit}</span>
      </span>
    </div>
  );
}

export function CreateSandboxDrawer({ open, onClose }: CreateSandboxDrawerProps) {
  const t = useT();

  // 当前租户配额上限:有配额(>0)就用它当资源滑块上界,否则回退硬上限。
  // 这样用户选不出超套餐的值,避免创建时被后端 422 拒(have/limit 超限)。
  const quota = useApp((s) => s.me?.quota);
  const maxCpu  = quota?.vcpu   ? Math.floor(quota.vcpu)   : FALLBACK_MAX.cpu;
  const maxMem  = quota?.mem_gb ? Math.floor(quota.mem_gb) : FALLBACK_MAX.mem;
  const maxDisk = quota?.disk_gb ? Math.floor(quota.disk_gb) : FALLBACK_MAX.disk;

  const [name,        setName]        = useState('');
  // image holds ImageDTO.id (short code), not the user-visible name.
  const [image,       setImage]       = useState('');
  // 默认值 clamp 到配额内:小套餐(如内存上限 2GiB)下默认就落在上限内,不超配额。
  const [cpu,         setCpu]         = useState(() => clamp(2, 1, maxCpu));
  const [mem,         setMem]         = useState(() => clamp(2, 1, maxMem));
  const [disk,        setDisk]        = useState(() => clamp(8, 4, maxDisk));
  const [policy,      setPolicy]      = useState<'allow-all' | 'allowlist' | 'block-all'>('allowlist');
  const [allowed,     setAllowed]     = useState('api.acme.dev\nregistry.npmjs.org\n*.github.com');
  const [selectedSec, setSelectedSec] = useState<string[]>([]);
  // 环境变量:KV 行(key/value 两输入框 + 加行)。明文配置走这里,敏感值走上面的凭据。
  const [envRows,     setEnvRows]     = useState<{ key: string; value: string }[]>([{ key: '', value: '' }]);
  const [advOpen,     setAdvOpen]     = useState(false);

  const setEnvRow = (i: number, patch: Partial<{ key: string; value: string }>) =>
    setEnvRows(rows => rows.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  const addEnvRow = () => setEnvRows(rows => [...rows, { key: '', value: '' }]);
  const removeEnvRow = (i: number) =>
    setEnvRows(rows => (rows.length === 1 ? [{ key: '', value: '' }] : rows.filter((_, idx) => idx !== i)));
  const envCount = envRows.filter(r => r.key.trim()).length;

  const create = useCreateSandbox();
  const { data: secretsData } = useSecrets();
  const secrets = secretsData?.secrets ?? [];

  const { data: imagesData, isLoading: imagesLoading, isError: imagesError } = useImages();
  const images = imagesData?.images ?? [];

  useEffect(() => {
    if (!image && images.length > 0) {
      const def = images.find(i => i.is_default) ?? images[0];
      setImage(def.id);
    }
  }, [images, image]);

  // 配额异步到达后,把已选值收敛到新上限内(初始 useState 时 quota 可能还没拉到)。
  useEffect(() => {
    setCpu((v) => clamp(v, 1, maxCpu));
    setMem((v) => clamp(v, 1, maxMem));
    setDisk((v) => clamp(v, 4, maxDisk));
  }, [maxCpu, maxMem, maxDisk]);

  const handleLaunch = () => {
    const envRecord: Record<string, string> = {};
    for (const { key, value } of envRows) {
      const k = key.trim();
      if (k) envRecord[k] = value;
    }
    const allowedHosts = policy === 'allowlist' ? allowed.split('\n').filter(Boolean) : undefined;
    create.mutate(
      {
        profile: name || undefined,
        image_id: image,
        resources: { cpu, memory: `${mem}GiB`, disk: `${disk}GiB` },
        network: policy === 'allow-all' ? 'open' : policy === 'block-all' ? 'sealed' : 'allowlist',
        network_allowed_hosts: allowedHosts,
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

  const selectedImage = images.find(i => i.id === image);

  return (
    <Drawer open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DrawerContent side="right" style={{ width: 560 }}>
        <DrawerHeader>
          <DrawerTitle>
            <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <TlnIcon name="box" size={16} style={{ color: 'var(--acc)' }} />
              {t('sbx.create.title')}
            </span>
          </DrawerTitle>
        </DrawerHeader>

        <div className="tln-drawer-body csd-body">
          <FormSection
            icon={<TlnIcon name="box" size={13} />}
            title={t('sbx.create.basics')}
          >
            <FormField>
              <FormLabel>{t('sbx.create.name')}</FormLabel>
              <FormControl>
                <Input
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder={t('sbx.create.namePlaceholder')}
                />
              </FormControl>
            </FormField>

            <FormField>
              <FormLabel>{t('sbx.colImage')}</FormLabel>
              <FormControl>
                <Select
                  value={image}
                  onValueChange={setImage}
                  disabled={imagesLoading || imagesError || images.length === 0}
                >
                  <SelectTrigger mono>
                    <SelectValue
                      placeholder={
                        imagesLoading ? t('common.loading')
                        : imagesError ? t('common.loadFailed')
                        : images.length === 0 ? t('sbx.create.noImages')
                        : t('sbx.create.imagePlaceholder', 'Pick an image')
                      }
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {images.map(img => (
                      <SelectItem key={img.id} value={img.id}>
                        <span className="csd-image-item">
                          <span className="name">{img.name}</span>
                          {img.is_default && <span className="default-tag">{t('sbx.create.defaultImage')}</span>}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormControl>
              {/* Description for the selected image — appears only here, not duplicated in trigger. */}
              {selectedImage?.description && (
                <FormDescription>{selectedImage.description}</FormDescription>
              )}
            </FormField>
          </FormSection>

          <FormSection
            icon={<TlnIcon name="cpu" size={13} />}
            title={t('sbx.create.resources')}
            hint={
              <span className="csd-cost">
                ~ <span className="cost">${estimatedCost(cpu, mem)}</span>/hr
              </span>
            }
          >
            <div className="csd-res-stack">
              <ResourceRow label="vCPU"   value={cpu}  min={1} max={maxCpu}  step={1} unit="vCPU" onChange={setCpu} />
              <ResourceRow label="MEMORY" value={mem}  min={1} max={maxMem}  step={1} unit="GiB"  onChange={setMem} />
              <ResourceRow label="DISK"   value={disk} min={4} max={maxDisk} step={4} unit="GiB"  onChange={setDisk} />
            </div>
          </FormSection>

          <FormSection
            icon={<TlnIcon name="network" size={13} />}
            title={t('sbx.create.network')}
          >
            <div className="csd-policy">
              {([
                { v: 'allow-all', title: t('sbx.create.allowAll'), desc: t('sbx.create.allowAllDesc') },
                { v: 'allowlist', title: t('sbx.create.allowlist'), desc: t('sbx.create.allowlistDesc') },
                { v: 'block-all', title: t('sbx.create.blockAll'),  desc: t('sbx.create.blockAllDesc') },
              ] as const).map(p => (
                <label key={p.v} data-active={policy === p.v}>
                  <input type="radio" checked={policy === p.v} onChange={() => setPolicy(p.v)} />
                  <span className="title">{p.title}</span>
                  <span className="desc">{p.desc}</span>
                </label>
              ))}
            </div>

            {policy === 'allowlist' && (
              <FormField className="csd-field-inset">
                <FormLabel>{t('sbx.create.allowedHosts')}</FormLabel>
                <FormControl>
                  <Textarea
                    value={allowed}
                    onChange={e => setAllowed(e.target.value)}
                    rows={4}
                    style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}
                  />
                </FormControl>
                <FormDescription>{t('sbx.create.allowedHint')}</FormDescription>
              </FormField>
            )}
          </FormSection>

          {/* ─────────────── L1: Advanced (collapsible) ───────────────
           * Stays as `.csd-block` because FormSection has a static title;
           * the collapsible toggle here is the section header itself. */}
          <div className="csd-block csd-block--collapsible">
            <button
              type="button"
              className="csd-adv-toggle"
              aria-expanded={advOpen}
              onClick={() => setAdvOpen(v => !v)}
            >
              <TlnIcon name="settings" size={13} className="ic" />
              <span>{t('sbx.create.advanced', '高级选项')}</span>
              <TlnIcon name={advOpen ? 'chevronDown' : 'chevronRight'} size={12} className="csd-adv-chev" />
              {(selectedSec.length > 0 || envCount > 0) && (
                <span className="csd-adv-count">
                  {selectedSec.length + envCount}
                </span>
              )}
            </button>

            {advOpen && (
              <div className="csd-adv-body">
                <FormField>
                  <FormLabel>{t('sbx.create.secrets')}</FormLabel>
                  <FormControl>
                    <MultiSelect value={selectedSec} onValueChange={setSelectedSec}>
                      <MultiSelectTrigger placeholder={t('sbx.create.addSecret')} />
                      <MultiSelectContent>
                        <MultiSelectEmpty>{t('sbx.create.noSecrets', '没有可用凭据')}</MultiSelectEmpty>
                        {secrets.map(s => (
                          <MultiSelectItem key={s.id} value={s.id}>
                            {s.name}
                          </MultiSelectItem>
                        ))}
                      </MultiSelectContent>
                    </MultiSelect>
                  </FormControl>
                  <FormDescription>{t('sbx.create.secretsHint')}</FormDescription>
                </FormField>

                <FormField>
                  <FormLabel>{t('sbx.create.env')}</FormLabel>
                  <FormControl>
                    <div className="csd-env-rows">
                      {envRows.map((row, i) => (
                        <div key={i} className="csd-env-row">
                          <Input
                            value={row.key}
                            onChange={e => setEnvRow(i, { key: e.target.value })}
                            placeholder="KEY"
                            style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}
                          />
                          <span className="csd-env-eq">=</span>
                          <Input
                            value={row.value}
                            onChange={e => setEnvRow(i, { value: e.target.value })}
                            placeholder="value"
                            style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}
                          />
                          <Button
                            variant="ghost" size="sm" iconOnly
                            onClick={() => removeEnvRow(i)}
                            aria-label={t('common.remove', '移除')}
                            title={t('common.remove', '移除')}
                          >
                            <TlnIcon name="trash" size={13} />
                          </Button>
                        </div>
                      ))}
                      <Button variant="ghost" size="sm" onClick={addEnvRow} className="csd-env-add">
                        <TlnIcon name="plus" size={13} />
                        {t('sbx.create.envAdd', '添加变量')}
                      </Button>
                    </div>
                  </FormControl>
                  <FormDescription>{t('sbx.create.envHint')}</FormDescription>
                </FormField>
              </div>
            )}
          </div>
        </div>

        <DrawerFooter>
          <Button variant="ghost" onClick={onClose}>{t('common.cancel')}</Button>
          <Button
            variant="primary"
            loading={create.isPending}
            disabled={create.isPending || !image}
            onClick={handleLaunch}
          >
            <TlnIcon name="zap" size={14} />
            {t('sbx.create.launch')}
          </Button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
