/* PageRecording — full-bleed recording playback via @talon-sandbox/react RecordingPlayer.
 * Metadata from useRecordings(); frame data requires GET /v1/recordings/{id}/frames
 * (BACKEND GAP — see comment below).
 */
import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { RecordingPlayer, EmptyState } from '@talon-sandbox/react';
import { useT } from '../i18n/useT';
import { TlnIcon } from '../icons/TlnIcon';
import { useRecordings } from '../hooks';
import type { RecordingFrame } from '@talon-sandbox/react';

import './PageRecording.css';

// BACKEND GAP: GET /v1/recordings/{id}/frames is not yet implemented.
// RecordingDTO.frames is a count (number), not frame data.
// Until the endpoint exists and useRecording(id) hook is added, we pass
// an empty frames array — the player renders chrome but no content.
// TODO: add GET /v1/recordings/{id}/frames → { frames: RecordingFrame[] }
//       and useRecording(id) hook in src/hooks/useRecordings.ts.
const EMPTY_FRAMES: RecordingFrame[] = [];

export function PageRecording() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const t = useT();

  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);

  // Fetch full list and find by id until GET /v1/recordings/{id} exists.
  const { data, isLoading, isError } = useRecordings({});
  const recording = data?.items.find(r => r.id === id);

  if (isLoading) {
    return (
      <div className="recp">
        <EmptyState title={t('recordings.loadingPlayer')} />
      </div>
    );
  }

  if (isError || (!isLoading && !recording)) {
    return (
      <div className="recp">
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

  return (
    <RecordingPlayer
      recording={{
        id:       recording.id,
        name:     recording.title,
        duration: recording.duration_sec,
      }}
      frames={EMPTY_FRAMES}
      currentTime={currentTime}
      onSeek={setCurrentTime}
      isPlaying={isPlaying}
      onTogglePlay={() => setIsPlaying(p => !p)}
      speed={speed}
      onSpeedChange={setSpeed}
      speedOptions={[0.5, 1, 2, 4]}
      onBack={() => navigate('/recordings')}
      className="recp"
    />
  );
}
