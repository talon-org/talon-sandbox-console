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

  const [name,        setName]        = useState('');
  // image holds ImageDTO.id (short code), not the user-visible name.
  const [image,       setImage]       = useState('');
  const [cpu,         setCpu]         = useState(2);
  const [mem,         setMem]         = useState(4);
  const [disk,        setDisk]        = useState(8);
  const [policy,      setPolicy]      = useState<'allow-all' | 'allowlist' | 'block-all'>('allowlist');
  const [allowed,     setAllowed]     = useState('api.acme.dev\nregistry.npmjs.org\n*.github.com');
  const [selectedSec, setSelectedSec] = useState<string[]>([]);
  const [env,         setEnv]         = useState('');
  const [advOpen,     setAdvOpen]     = useState(false);

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
              <ResourceRow label="vCPU"   value={cpu}  min={1} max={16} step={1} unit="vCPU" onChange={setCpu} />
              <ResourceRow label="MEMORY" value={mem}  min={1} max={32} step={1} unit="GiB"  onChange={setMem} />
              <ResourceRow label="DISK"   value={disk} min={4} max={64} step={4} unit="GiB"  onChange={setDisk} />
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
              {(selectedSec.length > 0 || env.trim().length > 0) && (
                <span className="csd-adv-count">
                  {selectedSec.length + (env.trim() ? 1 : 0)}
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
                    <Textarea
                      value={env}
                      onChange={e => setEnv(e.target.value)}
                      rows={3}
                      placeholder="KEY=value"
                      style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}
                    />
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
