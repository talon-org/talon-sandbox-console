/* PageRecordings — workspace: recording session list.
 * 1:1 port of page-recording.jsx prototype (list view).
 */
import { useNavigate } from 'react-router-dom';
import { PageHeader, Button } from '@talon-sandbox/react';
import { useT } from '../i18n/useT';
import { TlnIcon } from '../icons/TlnIcon';
import { MOCK_RECORDINGS, relTime } from '../mock/data';
// TODO: replace mock with apiGet('/v1/recordings')

import './PageRecordings.css';

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
