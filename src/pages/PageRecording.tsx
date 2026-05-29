/* PageRecording — full-bleed recording playback page.
 * Shell: RecordingPlayer local business component.
 * Data: recording metadata from useRecordings() matched by id.
 * NOTE: Frames/steps require GET /v1/recordings/{id}/frames (backend gap).
 *       Until that endpoint exists, frames are empty and steps are derived
 *       from recording metadata only. Visual shell is fully functional.
 */
import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { EmptyState } from '../components';
import { useT } from '../i18n/useT';
import { TlnIcon } from '../icons/TlnIcon';
import { useRecordings } from '../hooks';
import { RecordingPlayer } from '../components/RecordingPlayer';

import './PageRecording.css';

export function PageRecording() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const t = useT();

  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying,   setIsPlaying]   = useState(false);
  const [speed,       setSpeed]       = useState(1);

  // Fetch full list and find by id until GET /v1/recordings/{id} exists.
  const { data, isLoading, isError } = useRecordings({});
  const recording = data?.items.find(r => r.id === id);

  if (isLoading) {
    return (
      <div className="recp-loading">
        <EmptyState title={t('recordings.loadingPlayer')} />
      </div>
    );
  }

  if (isError || (!isLoading && !recording)) {
    return (
      <div className="recp-loading">
        <EmptyState
          icon={<TlnIcon name="alert" size={24} />}
          title={t('recordings.notFound')}
          description={t('recordings.notFoundDesc')}
          action={
            <button type="button" onClick={() => navigate('/recordings')} style={{ cursor: 'pointer' }}>
              {t('recordings.back')}
            </button>
          }
        />
      </div>
    );
  }

  if (!recording) return null;

  // BACKEND GAP: frames come from GET /v1/recordings/{id}/frames which does not
  // yet exist. Pass empty frames array — player renders empty stage with
  // "press space to start" hint. Steps similarly empty until backend provides them.
  return (
    <RecordingPlayer
      recording={{
        id:          recording.id,
        title:       recording.title,
        durationSec: recording.duration_sec,
      }}
      frames={[]}
      steps={[]}
      currentTime={currentTime}
      onSeek={setCurrentTime}
      isPlaying={isPlaying}
      onTogglePlay={() => setIsPlaying(p => !p)}
      speed={speed}
      onSpeedChange={setSpeed}
      onBack={() => navigate('/recordings')}
    />
  );
}
