import EditableItem from './EditableItem';
import { T } from '../lib/theme';

// The PDF canvas plus its overlay items. The inner layer is rendered at the
// fixed RENDER_SCALE and visually zoomed with a CSS transform, so item
// coordinates never change when the user zooms. The canvas is always mounted
// (even before a PDF loads) so canvasRef is available for the first render.
export default function Workspace({
  canvasRef, pdfBuffer, canvasDims, zoom, items, errorMessage, selectedId,
  onSelect, onCanvasDoubleClick, dragHandlers, onUpdate, onDelete,
}) {
  const w = canvasDims.width || 0;
  const h = canvasDims.height || 0;
  const ready = !!pdfBuffer && w > 0;

  return (
    <div
      style={{
        position: 'relative',
        width: ready ? w * zoom : '100%',
        maxWidth: ready ? 'none' : 600,
        height: ready ? h * zoom : 500,
        border: `1px solid ${T.hairline}`,
        borderRadius: 18,
        overflow: 'hidden',
        background: T.canvas,
        boxShadow: ready ? 'rgba(0, 0, 0, 0.22) 3px 5px 30px 0' : 'none',
      }}
    >
      <div
        style={{
          width: w,
          height: h,
          position: 'relative',
          transform: `scale(${zoom})`,
          transformOrigin: '0 0',
          display: ready ? 'block' : 'none',
        }}
      >
        <canvas
          ref={canvasRef}
          onDoubleClick={onCanvasDoubleClick}
          onMouseDown={(e) => { if (e.target === canvasRef.current) onSelect(null); }}
          style={{ display: 'block' }}
        />
        {ready && items.map((item) => (
          <EditableItem
            key={item.id}
            item={item}
            zoom={zoom}
            selected={item.id === selectedId}
            onSelect={onSelect}
            {...dragHandlers}
            onUpdate={onUpdate}
            onDelete={onDelete}
          />
        ))}
      </div>

      {!ready && (
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {!errorMessage && (
            <span style={{ color: T.inkMuted48, fontSize: 17, letterSpacing: '-0.374px' }}>
              Upload a PDF to start editing
            </span>
          )}
        </div>
      )}
    </div>
  );
}
