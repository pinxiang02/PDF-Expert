import { useEffect, useRef, useState } from 'react';
import ModalShell from './ModalShell';
import { T, pillPrimary, pillGhost } from '../lib/theme';

// Multi-page document scanner. Shows a live camera preview, lets the user snap
// several photos (with retake/remove + a front/back flip), then hands the
// ordered list of JPEG data URLs back via onCreate to become a multi-page PDF.
export default function CameraModal({ onCancel, onCreate }) {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const [shots, setShots] = useState([]);
  const [facing, setFacing] = useState('environment');
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    const stop = () => { if (streamRef.current) { streamRef.current.getTracks().forEach((t) => t.stop()); streamRef.current = null; } };

    (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: facing }, audio: false });
        if (!active) { stream.getTracks().forEach((t) => t.stop()); return; }
        streamRef.current = stream;
        if (videoRef.current) videoRef.current.srcObject = stream;
      } catch {
        if (active) setError('Could not access the camera. Allow camera permission, or add photos from your library below.');
      }
    })();

    return () => { active = false; stop(); };
  }, [facing]);

  const capture = () => {
    const video = videoRef.current;
    if (!video || !video.videoWidth) return;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d').drawImage(video, 0, 0);
    setShots((s) => [...s, canvas.toDataURL('image/jpeg', 0.92)]);
  };

  // Fallback when the live camera is unavailable: read picked/captured files.
  const addFromFiles = (e) => {
    const files = Array.from(e.target.files || []);
    e.target.value = '';
    files.forEach((f) => {
      const reader = new FileReader();
      reader.onload = () => setShots((s) => [...s, reader.result]);
      reader.readAsDataURL(f);
    });
  };

  const removeShot = (i) => setShots((s) => s.filter((_, idx) => idx !== i));

  return (
    <ModalShell onBackdrop={onCancel} style={{ padding: 20, gap: 14, alignItems: 'stretch', width: 'min(520px, 92vw)' }}>
      <strong style={{ fontSize: 21, color: T.ink, fontWeight: 600, letterSpacing: '-0.374px' }}>
        Scan with camera
      </strong>

      {error ? (
        <div style={{ padding: '12px 14px', background: '#fff0f0', color: '#b00020', borderRadius: 11, fontSize: 14, border: '1px solid #f3c2c2' }}>
          {error}
        </div>
      ) : (
        <div style={{ position: 'relative', background: '#000', borderRadius: 12, overflow: 'hidden' }}>
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            style={{ width: '100%', display: 'block', maxHeight: '46vh', objectFit: 'contain', background: '#000' }}
          />
          <button
            onClick={() => setFacing((f) => (f === 'environment' ? 'user' : 'environment'))}
            title="Flip camera"
            style={{ position: 'absolute', top: 8, right: 8, ...pillGhost(true), padding: '6px 12px', fontSize: 13, background: 'rgba(255,255,255,0.9)' }}
          >
            ⇄ Flip
          </button>
        </div>
      )}

      <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
        {!error && (
          <button onClick={capture} style={{ ...pillPrimary(true), padding: '9px 20px', fontSize: 15 }}>
            ◉ Capture
          </button>
        )}
        <label style={{ ...pillGhost(true), padding: '9px 18px', fontSize: 15 }}>
          Add photo
          <input type="file" accept="image/*" capture="environment" multiple onChange={addFromFiles} style={{ display: 'none' }} />
        </label>
        <span style={{ fontSize: 14, color: T.inkMuted48 }}>{shots.length} page{shots.length !== 1 ? 's' : ''}</span>
      </div>

      {shots.length > 0 && (
        <div style={{ display: 'flex', gap: 8, overflowX: 'auto', padding: '4px 0' }}>
          {shots.map((src, i) => (
            <div key={i} style={{ position: 'relative', flex: '0 0 auto' }}>
              <img src={src} alt={`page ${i + 1}`} style={{ height: 90, borderRadius: 8, border: `1px solid ${T.hairline}`, display: 'block' }} />
              <button
                onClick={() => removeShot(i)}
                title="Remove"
                style={{ position: 'absolute', top: -6, right: -6, width: 20, height: 20, borderRadius: '50%', border: 'none', background: '#b00020', color: '#fff', cursor: 'pointer', fontSize: 12, lineHeight: 1 }}
              >
                ✕
              </button>
              <span style={{ position: 'absolute', bottom: 2, left: 4, fontSize: 11, color: '#fff', textShadow: '0 0 3px #000' }}>{i + 1}</span>
            </div>
          ))}
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
        <button onClick={onCancel} style={{ ...pillGhost(true), padding: '8px 18px', fontSize: 15 }}>Cancel</button>
        <button onClick={() => onCreate(shots)} disabled={!shots.length} style={{ ...pillPrimary(shots.length > 0), padding: '8px 18px', fontSize: 15 }}>
          Create PDF{shots.length ? ` (${shots.length})` : ''}
        </button>
      </div>
    </ModalShell>
  );
}
