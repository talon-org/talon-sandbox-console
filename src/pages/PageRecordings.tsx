/* PageRecordings — workspace: recording session list.
 * 1:1 port of page-recording.jsx prototype (list view).
 */
import { useNavigate } from 'react-router-dom';
import { PageHeader, Button } from '@talon-sandbox/react';
import { useT } from '../i18n/useT';
import { TlnIcon } from '../icons/TlnIcon';
import { MOCK_RECORDINGS, relTime } from '../mock/data';
// TODO: replace mock with apiGet('/v1/recordings')

// ── inject styles once ────────────────────────────────────────────────────────
if (!document.getElementById('tln-page-recordings-styles')) {
  const s = document.createElement('style');
  s.id = 'tln-page-recordings-styles';
  s.textContent = `
.rec-row {
  grid-template-columns: 1.8fr 1fr 0.8fr 0.9fr 0.6fr 0.6fr 60px;
}
.rec-row .rectitle { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
.rec-row .rectitle .t1 { font-size: 13px; color: var(--fg-0); font-weight: 500; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.rec-row .rectitle .t2 { font-family: var(--font-mono); font-size: 11px; color: var(--fg-3); }
.rec-row .agentpill {
  font-family: var(--font-mono);
  font-size: 10.5px;
  color: var(--magenta, #c678dd);
  background: var(--magenta-soft, rgba(198,120,221,.1));
  padding: 2px 7px;
  border-radius: 3px;
  display: inline-flex; align-items: center; gap: 5px;
  width: fit-content;
}
`;
  document.head.appendChild(s);
}

function fmtDuration(sec: number): string {
  return `${Math.floor(sec / 60)}m ${(sec % 60).toString().padStart(2, '0')}s`;
}

export function PageRecordings() {
  const t = useT();
  const navigate = useNavigate();
  const recordings = MOCK_RECORDINGS;
  // TODO: replace with apiGet('/v1/recordings')

  return (
    <>
      <PageHeader
        eyebrow={t('recordings.eyebrow')}
        title={t('recordings.title')}
        num={`${recordings.length}`}
        desc={t('recordings.desc')}
        actions={
          <>
            <Button variant="ghost">
              <TlnIcon name="filter" size={14} />
              {t('common.filter')}
            </Button>
            <Button variant="ghost">
              <TlnIcon name="download" size={14} />
              {t('common.export')}
            </Button>
          </>
        }
      />

      <div className="page-body">
        <div className="tln-tbl">
          <div className="tln-tbl-head rec-row">
            <div>{t('recordings.colTitle')}</div>
            <div>{t('recordings.colSandbox')}</div>
            <div>{t('recordings.colAgent')}</div>
            <div>{t('recordings.colStarted')}</div>
            <div>{t('recordings.colDuration')}</div>
            <div>{t('recordings.colSteps')}</div>
            <div />
          </div>

          {recordings.map(r => {
            const ageSec = Math.round((Date.now() - new Date(r.startedAt).getTime()) / 1000);
            return (
              <div
                key={r.id}
                className="tln-tbl-row rec-row"
                style={{ cursor: 'pointer' }}
                onClick={() => navigate('/recordings/' + r.id)}
              >
                <div className="rectitle">
                  <span className="t1">{r.title}</span>
                  <span className="t2">{r.id} · {Math.round(r.sizeKB)} KiB · {r.frames} frames</span>
                </div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>
                  {r.sandboxId} · {r.sandboxName}
                </div>
                <div>
                  <span className="agentpill">
                    <TlnIcon name="agent" size={11} />
                    {r.agent}
                  </span>
                </div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--fg-3)' }}>
                  {relTime(ageSec)}
                </div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11 }}>
                  {fmtDuration(r.durationSec)}
                </div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--fg-1)' }}>
                  {r.steps}
                </div>
                <div className="actions" onClick={e => e.stopPropagation()}>
                  <Button variant="ghost" size="sm" iconOnly aria-label="More">
                    <TlnIcon name="more" size={14} />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}
