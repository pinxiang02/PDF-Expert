import { useState } from 'react';
import ModalShell from './ModalShell';
import { T, pillPrimary, pillGhost } from '../lib/theme';

const COLORS = [
  { name: 'Grey', r: 0.6, g: 0.6, b: 0.6 },
  { name: 'Red', r: 0.85, g: 0.15, b: 0.15 },
  { name: 'Blue', r: 0.1, g: 0.35, b: 0.75 },
  { name: 'Black', r: 0, g: 0, b: 0 },
];

const field = { display: 'flex', flexDirection: 'column', gap: 6 };
const lbl = { fontSize: 13, color: T.inkMuted80, letterSpacing: '-0.224px' };

export default function WatermarkModal({ current, onApply, onRemove, onCancel }) {
  const [text, setText] = useState(current?.text ?? 'CONFIDENTIAL');
  const [fontSize, setFontSize] = useState(current?.fontSize ?? 60);
  const [opacity, setOpacity] = useState(current?.opacity ?? 0.3);
  const [rotation, setRotation] = useState(current?.rotation ?? 45);
  const [colorIdx, setColorIdx] = useState(() => {
    const c = current?.color;
    const i = c ? COLORS.findIndex((k) => k.r === c.r && k.g === c.g && k.b === c.b) : 0;
    return i < 0 ? 0 : i;
  });

  const apply = () => {
    const { r, g, b } = COLORS[colorIdx];
    onApply({ text: text.trim(), fontSize, opacity, rotation, color: { r, g, b } });
  };

  return (
    <ModalShell onBackdrop={onCancel} style={{ padding: 24, gap: 18, alignItems: 'stretch', width: 420 }}>
      <strong style={{ fontSize: 21, color: T.ink, fontWeight: 600, letterSpacing: '-0.374px' }}>
        Watermark
      </strong>

      <div style={field}>
        <span style={lbl}>Text</span>
        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="e.g. CONFIDENTIAL"
          style={{ padding: '9px 12px', fontSize: 15, border: `1px solid ${T.hairline}`, borderRadius: 10, fontFamily: 'inherit', color: T.ink, outline: 'none' }}
        />
      </div>

      <div style={field}>
        <span style={lbl}>Size — {fontSize}px</span>
        <input type="range" min={20} max={140} value={fontSize} onChange={(e) => setFontSize(Number(e.target.value))} />
      </div>

      <div style={field}>
        <span style={lbl}>Opacity — {Math.round(opacity * 100)}%</span>
        <input type="range" min={5} max={100} value={Math.round(opacity * 100)} onChange={(e) => setOpacity(Number(e.target.value) / 100)} />
      </div>

      <div style={field}>
        <span style={lbl}>Rotation — {rotation}°</span>
        <input type="range" min={0} max={90} value={rotation} onChange={(e) => setRotation(Number(e.target.value))} />
      </div>

      <div style={field}>
        <span style={lbl}>Color</span>
        <div style={{ display: 'flex', gap: 8 }}>
          {COLORS.map((c, i) => (
            <button
              key={c.name}
              onClick={() => setColorIdx(i)}
              title={c.name}
              style={{
                width: 30, height: 30, borderRadius: 9999, cursor: 'pointer',
                background: `rgb(${c.r * 255},${c.g * 255},${c.b * 255})`,
                border: i === colorIdx ? `2px solid ${T.blue}` : '2px solid transparent',
                outline: i === colorIdx ? `1px solid ${T.blue}` : 'none', outlineOffset: 2,
              }}
            />
          ))}
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, marginTop: 4 }}>
        {current
          ? <button onClick={onRemove} style={{ ...pillGhost(true), padding: '8px 18px', fontSize: 15, color: '#b00020', borderColor: '#e0a0a0' }}>Remove</button>
          : <span />}
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={onCancel} style={{ ...pillGhost(true), padding: '8px 18px', fontSize: 15 }}>Cancel</button>
          <button onClick={apply} disabled={!text.trim()} style={{ ...pillPrimary(!!text.trim()), padding: '8px 18px', fontSize: 15 }}>Apply</button>
        </div>
      </div>
    </ModalShell>
  );
}
