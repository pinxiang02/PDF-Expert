import { useState } from 'react';
import { T, frostedBar, miniSelect, toolBtn } from '../lib/theme';
import { FONT_FAMILIES, cssFontFamily } from '../lib/fonts';
import { tickPoints, tickThickness } from '../lib/shapes';

const FONT_SIZES = [8, 10, 12, 14, 16, 18, 20, 24, 28, 32];
const TICK_SIZES = [16, 20, 24, 32, 40, 56];
const SIG_WIDTHS = [120, 160, 200, 260, 320];

// One placed overlay: text box, signature image, or tick. The content sits at
// the item's origin (x, y) so it maps 1:1 to the baked PDF position; the control
// bar floats just outside the content so it never shifts the anchor point.
// Controls only appear on hover / focus / drag so they don't block the document.
export default function EditableItem({ item, selected, onSelect, onPointerDown, onPointerMove, onPointerUp, onUpdate, onDelete }) {
  const [hover, setHover] = useState(false);
  const [dragging, setDragging] = useState(false);
  const active = hover || dragging || selected;
  const toolbarBelow = item.y < 44;

  const dragHandle = (
    <span
      title="Drag to move"
      onPointerDown={(e) => { setDragging(true); onPointerDown(e, item); }}
      onPointerMove={onPointerMove}
      onPointerUp={(e) => { onPointerUp(e); setDragging(false); }}
      style={{ cursor: 'move', userSelect: 'none', touchAction: 'none', color: T.blue, fontSize: 14, fontWeight: 600, padding: '0 2px', lineHeight: 1 }}
    >
      ⠿
    </span>
  );

  const deleteBtn = (
    <button
      title="Delete"
      onClick={() => onDelete(item.id)}
      style={{ color: '#b00020', background: 'none', border: 'none', cursor: 'pointer', fontSize: 15, fontWeight: 600, lineHeight: 1, padding: '0 2px' }}
    >
      ✕
    </button>
  );

  let content;
  let controls;

  if (item.type === 'signature') {
    content = (
      <img src={item.dataUrl} alt="signature" width={item.width} height={item.height} style={{ display: 'block', pointerEvents: 'none' }} />
    );
    controls = (
      <select
        title="Size"
        value={item.width}
        onChange={(e) => { const w = Number(e.target.value); onUpdate(item.id, { width: w, height: Math.round(w / item.aspect) }); }}
        style={miniSelect}
      >
        {SIG_WIDTHS.map((w) => <option key={w} value={w}>{w}px</option>)}
      </select>
    );
  } else if (item.type === 'tick') {
    const s = item.size;
    const pts = tickPoints(s).map((p) => `${p.x},${p.y}`).join(' ');
    content = (
      <svg width={s} height={s} style={{ display: 'block' }}>
        <polyline points={pts} fill="none" stroke={T.ink} strokeWidth={tickThickness(s)} strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
    controls = (
      <select title="Size" value={item.size} onChange={(e) => onUpdate(item.id, { size: Number(e.target.value) })} style={miniSelect}>
        {TICK_SIZES.map((v) => <option key={v} value={v}>{v}px</option>)}
      </select>
    );
  } else {
    content = (
      <input
        type="text"
        value={item.text}
        onChange={(e) => onUpdate(item.id, { text: e.target.value })}
        style={{
          background: item.highlight ? '#fff03b' : 'transparent',
          border: 'none', outline: 'none', padding: 0,
          fontSize: `${item.fontSize}px`,
          fontFamily: cssFontFamily(item.fontFamily),
          fontWeight: item.bold ? 'bold' : 'normal',
          color: T.ink, minWidth: 80, cursor: 'text',
        }}
      />
    );
    controls = (
      <>
        <select title="Font type" value={item.fontFamily} onChange={(e) => onUpdate(item.id, { fontFamily: e.target.value })} style={miniSelect}>
          {FONT_FAMILIES.map((f) => <option key={f} value={f}>{f}</option>)}
        </select>
        <select title="Font size" value={item.fontSize} onChange={(e) => onUpdate(item.id, { fontSize: Number(e.target.value) })} style={miniSelect}>
          {FONT_SIZES.map((v) => <option key={v} value={v}>{v}px</option>)}
        </select>
        <button title="Bold" onClick={() => onUpdate(item.id, { bold: !item.bold })} style={{ ...toolBtn(item.bold), fontWeight: 700 }}>B</button>
        <button
          title="Highlight"
          onClick={() => onUpdate(item.id, { highlight: !item.highlight })}
          style={{ ...toolBtn(item.highlight), background: item.highlight ? '#f4c000' : T.canvas, borderColor: item.highlight ? '#f4c000' : T.hairline, color: item.highlight ? T.ink : T.inkMuted80 }}
        >
          H
        </button>
      </>
    );
  }

  return (
    <div
      style={{
        position: 'absolute',
        left: item.x,
        top: item.y,
        zIndex: active ? 20 : 10,
        outline: active ? `1px dashed ${T.blue}` : 'none',
        outlineOffset: 2,
      }}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onMouseDown={() => onSelect(item.id)}
    >
      {content}
      {active && (
        <div
          style={{
            ...frostedBar,
            position: 'absolute',
            left: 0,
            whiteSpace: 'nowrap',
            [toolbarBelow ? 'top' : 'bottom']: '100%',
            [toolbarBelow ? 'marginTop' : 'marginBottom']: 6,
          }}
        >
          {dragHandle}
          {controls}
          {deleteBtn}
        </div>
      )}
    </div>
  );
}
