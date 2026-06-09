import { useRef, useState } from 'react';
import ModalShell from './ModalShell';
import { T, pillPrimary, pillGhost } from '../lib/theme';

const W = 520;
const H = 200;

export default function SignatureModal({ onCancel, onAdd }) {
  const canvasRef = useRef(null);
  const drawing = useRef(false);
  const last = useRef(null);
  const [hasInk, setHasInk] = useState(false);

  const pos = (e) => {
    const r = canvasRef.current.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };

  const down = (e) => {
    e.preventDefault();
    canvasRef.current.setPointerCapture(e.pointerId);
    drawing.current = true;
    last.current = pos(e);
  };

  const move = (e) => {
    if (!drawing.current) return;
    const p = pos(e);
    const ctx = canvasRef.current.getContext('2d');
    ctx.strokeStyle = '#1d1d1f';
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(last.current.x, last.current.y);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
    last.current = p;
    if (!hasInk) setHasInk(true);
  };

  const up = () => { drawing.current = false; };

  const clear = () => {
    const c = canvasRef.current;
    c.getContext('2d').clearRect(0, 0, c.width, c.height);
    setHasInk(false);
  };

  const add = () => {
    const c = canvasRef.current;
    onAdd(c.toDataURL('image/png'), c.width, c.height);
  };

  return (
    <ModalShell onBackdrop={onCancel} style={{ padding: 24, gap: 16, alignItems: 'stretch' }}>
      <strong style={{ fontSize: 21, color: T.ink, fontWeight: 600, letterSpacing: '-0.374px' }}>
        Draw your signature
      </strong>

      <canvas
        ref={canvasRef}
        width={W}
        height={H}
        onPointerDown={down}
        onPointerMove={move}
        onPointerUp={up}
        style={{ width: W, height: H, background: '#ffffff', border: `1px dashed ${T.hairline}`, borderRadius: 11, touchAction: 'none', cursor: 'crosshair' }}
      />

      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
        <button onClick={clear} style={{ ...pillGhost(true), padding: '8px 18px', fontSize: 15 }}>Clear</button>
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={onCancel} style={{ ...pillGhost(true), padding: '8px 18px', fontSize: 15 }}>Cancel</button>
          <button onClick={add} disabled={!hasInk} style={{ ...pillPrimary(hasInk), padding: '8px 18px', fontSize: 15 }}>Add Signature</button>
        </div>
      </div>
    </ModalShell>
  );
}
