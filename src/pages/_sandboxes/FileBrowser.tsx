/* src/pages/_sandboxes/FileBrowser.tsx
 * 只读文件浏览器：左侧目录列表 + 右侧文件内容预览（纯文本）。
 * TabFiles 的核心子组件，单独拆出以控制行数。
 */
import { useState } from 'react';
import { Card, Button } from '@talon-sandbox/react';
import { useT } from '../../i18n/useT';
import { TlnIcon } from '../../icons/TlnIcon';
import { InlineEmpty } from '../../components/InlineEmpty';
import { useSandboxFsList, useSandboxFileContent } from '../../hooks/useSandboxFiles';
import type { FSEntry } from '../../api/types';

interface Props {
  sandboxId: string;
}

// ── 工具函数 ───────────────────────────────────────────────────────────────────

/** 将字节数格式化为可读字符串，如 "4.2 KB" */
function fmtSize(bytes: number): string {
  if (bytes === 0) return '—';
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

/** 将 Unix 秒格式化为本地时间字符串 */
function fmtModTime(ts: number): string {
  if (!ts) return '—';
  return new Date(ts * 1000).toISOString().slice(0, 16).replace('T', ' ');
}

// ── 面包屑组件 ────────────────────────────────────────────────────────────────

interface BreadcrumbProps {
  path: string;           // 当前路径，如 "workspace/src"
  onNavigate: (p: string) => void;
  rootLabel: string;
}

function Breadcrumb({ path, onNavigate, rootLabel }: BreadcrumbProps) {
  // 将路径分割为段，生成可点击的面包屑
  const parts = path ? path.split('/').filter(Boolean) : [];
  return (
    <div className="tab-files-breadcrumb">
      <button
        className="tab-files-bc-item tab-files-bc-clickable"
        onClick={() => onNavigate('')}
      >
        <TlnIcon name="folder" size={12} />
        {rootLabel}
      </button>
      {parts.map((part, idx) => {
        const segPath = parts.slice(0, idx + 1).join('/');
        const isLast  = idx === parts.length - 1;
        return (
          <span key={segPath} className="tab-files-bc-seg">
            <span className="tab-files-bc-sep">/</span>
            {isLast ? (
              <span className="tab-files-bc-item tab-files-bc-current">{part}</span>
            ) : (
              <button
                className="tab-files-bc-item tab-files-bc-clickable"
                onClick={() => onNavigate(segPath)}
              >
                {part}
              </button>
            )}
          </span>
        );
      })}
    </div>
  );
}

// ── 目录行组件 ────────────────────────────────────────────────────────────────

interface EntryRowProps {
  entry: FSEntry;
  isSelected: boolean;
  onClickDir: (name: string) => void;
  onClickFile: (name: string) => void;
  t: (key: string, fallback?: string) => string;
}

function EntryRow({ entry, isSelected, onClickDir, onClickFile, t }: EntryRowProps) {
  const handleClick = () => {
    if (entry.is_dir) {
      onClickDir(entry.name);
    } else {
      onClickFile(entry.name);
    }
  };

  return (
    <div
      className={`tln-tbl-row tab-files-row${isSelected ? ' tab-files-row--selected' : ''}`}
      onClick={handleClick}
      role="button"
      tabIndex={0}
      onKeyDown={e => e.key === 'Enter' && handleClick()}
    >
      {/* 图标 + 名称 */}
      <span className="tab-files-entry-name">
        <TlnIcon
          name={entry.is_dir ? 'folder' : 'fileText'}
          size={13}
          style={{ color: entry.is_dir ? 'var(--info)' : 'var(--fg-3)', flex: '0 0 auto' }}
        />
        <span>{entry.name}</span>
        {entry.is_dir && <TlnIcon name="arrowRight" size={10} style={{ color: 'var(--fg-4, var(--fg-3))', marginLeft: 'auto' }} />}
      </span>
      {/* Size column (blank for directories). */}
      <span className="tab-files-col-right tab-files-col-size">
        {entry.is_dir ? '' : fmtSize(entry.size)}
      </span>
      {/* Modified-time column. */}
      <span className="tab-files-col-right tab-files-col-mtime">
        {fmtModTime(entry.mod_time)}
      </span>
    </div>
  );
}

// ── 主组件 ────────────────────────────────────────────────────────────────────

export function FileBrowser({ sandboxId }: Props) {
  const t = useT();

  // 当前浏览的目录路径（不含前导斜杠）
  const [currentPath, setCurrentPath] = useState('');
  // 当前选中的文件路径（含父目录）
  const [selectedFile, setSelectedFile] = useState<string | null>(null);

  // 列目录
  const { data: dirData, isLoading: dirLoading, error: dirError } = useSandboxFsList(sandboxId, currentPath);
  const entries = dirData?.entries ?? [];

  // 读取选中文件内容
  const { data: fileContent, isLoading: fileLoading, error: fileError } =
    useSandboxFileContent(sandboxId, selectedFile ?? '', selectedFile !== null);

  /** 进入子目录 */
  const enterDir = (name: string) => {
    const next = currentPath ? `${currentPath}/${name}` : name;
    setCurrentPath(next);
    setSelectedFile(null); // 切换目录时清空文件预览
  };

  /** 选择文件 */
  const selectFile = (name: string) => {
    const filePath = currentPath ? `${currentPath}/${name}` : name;
    setSelectedFile(filePath);
  };

  /** 返回上一级 */
  const goUp = () => {
    const idx = currentPath.lastIndexOf('/');
    setCurrentPath(idx > 0 ? currentPath.slice(0, idx) : '');
    setSelectedFile(null);
  };

  // ── 左侧目录面板 ─────────────────────────────────────────────────────────────
  const leftPanel = (
    <Card
      title={
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
          <TlnIcon name="folder" size={13} style={{ color: 'var(--info)' }} />
          <Breadcrumb
            path={currentPath}
            onNavigate={(p) => { setCurrentPath(p); setSelectedFile(null); }}
            rootLabel={t('detail.files.root')}
          />
        </div>
      }
      footer={
        currentPath ? (
          <Button variant="ghost" size="sm" onClick={goUp}>
            {t('detail.files.back')}
          </Button>
        ) : undefined
      }
    >
      {/* Table: shares .tln-tbl-head / .tln-tbl-row primitives with every
       * other list in the app (sandbox list, processes, audit). `--bare`
       * drops the border so the surrounding Card supplies the boundary. */}
      <div className="tln-tbl tln-tbl--bare">
        <div className="tln-tbl-head tab-files-row">
          <span>{t('detail.files.name')}</span>
          <span className="tab-files-col-right">{t('detail.files.size')}</span>
          <span className="tab-files-col-right">{t('detail.files.modified')}</span>
        </div>

        {/* Empty / loading / error use InlineEmpty (no border — Card already
         * supplies one). Real entries follow the same grid template as the
         * header so columns line up. */}
        {dirLoading && (
          <InlineEmpty size="sm" icon={<TlnIcon name="refresh" size={14} />}>
            {t('common.loading')}
          </InlineEmpty>
        )}
        {!dirLoading && dirError && (
          <InlineEmpty size="sm" tone="error" icon={<TlnIcon name="alert" size={14} />}>
            {dirError instanceof Error ? dirError.message : String(dirError)}
          </InlineEmpty>
        )}
        {!dirLoading && !dirError && entries.length === 0 && (
          <InlineEmpty size="sm" icon={<TlnIcon name="folder" size={14} />}>
            {t('detail.files.noEntries')}
          </InlineEmpty>
        )}
        {!dirLoading && !dirError && entries.map(entry => (
          <EntryRow
            key={entry.name}
            entry={entry}
            isSelected={selectedFile === (currentPath ? `${currentPath}/${entry.name}` : entry.name) && !entry.is_dir}
            onClickDir={enterDir}
            onClickFile={selectFile}
            t={t}
          />
        ))}
      </div>
    </Card>
  );

  // ── 右侧文件预览面板 ──────────────────────────────────────────────────────────
  const fileName = selectedFile ? selectedFile.split('/').pop() ?? '' : '';
  const rightPanel = (
    <Card
      title={
        selectedFile ? (
          <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <TlnIcon name="fileText" size={13} style={{ color: 'var(--fg-3)' }} />
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>{fileName}</span>
          </span>
        ) : (
          <span style={{ color: 'var(--fg-3)', fontWeight: 400 }}>
            {t('detail.files.selectFile')}
          </span>
        )
      }
    >
      {/* Resting state — md size because the preview pane occupies a full
       * card column, so a too-small placeholder reads as a render bug.
       * Card title already says "select a file to preview"; body uses a
       * shorter complementary cue rather than repeating the same sentence. */}
      {!selectedFile && (
        <InlineEmpty size="md" icon={<TlnIcon name="fileText" size={16} />}>
          {t('detail.files.previewIdle')}
        </InlineEmpty>
      )}

      {/* Loading / error states for the actual file content. */}
      {selectedFile && fileLoading && (
        <InlineEmpty size="md" icon={<TlnIcon name="refresh" size={14} />}>
          {t('common.loading')}
        </InlineEmpty>
      )}

      {selectedFile && !fileLoading && fileError && (
        <InlineEmpty size="md" tone="error" icon={<TlnIcon name="alert" size={14} />}>
          {fileError instanceof Error ? fileError.message : String(fileError)}
        </InlineEmpty>
      )}

      {/* 文件内容 */}
      {selectedFile && !fileLoading && !fileError && fileContent !== undefined && (
        <pre className="tab-files-preview-pre">{fileContent}</pre>
      )}
    </Card>
  );

  return (
    <div className="sbx-2col">
      {leftPanel}
      {rightPanel}
    </div>
  );
}
