import { useEffect, useRef, useState } from 'react';
import { T } from '../lib/theme';

const THUMB_WIDTH = 132;

// Left-hand page navigator. Renders each PDF page into a small canvas using the
// shared pdf.js document, highlights the current page, and jumps to a page when
// its thumbnail is clicked. Pages can be dragged to reorder them (onReorder).
// Rendering runs sequentially so we never kick off two render tasks for the same
// page object at once.
export default function Thumbnails({ pdfJsDoc, totalPages, currentPage, onSelect, onReorder }) {
  const canvasRefs = useRef([]);
  const [dragPage, setDragPage] = useState(null);
  const [overPage, setOverPage] = useState(null);

  useEffect(() => {
    if (!pdfJsDoc) return;
    let cancelled = false;

    (async () => {
      for (let n = 1; n <= totalPages; n++) {
        if (cancelled) return;
        const canvas = canvasRefs.current[n - 1];
        if (!canvas) continue;
        try {
          const page = await pdfJsDoc.getPage(n);
          const base = page.getViewport({ scale: 1 });
          const viewport = page.getViewport({ scale: THUMB_WIDTH / base.width });
          canvas.width = viewport.width;
          canvas.height = viewport.height;
          await page.render({ canvasContext: canvas.getContext('2d'), viewport }).promise;
        } catch {
          // Page may be unavailable mid-reload; skip and continue.
        }
      }
    })();

    return () => { cancelled = true; };
  }, [pdfJsDoc, totalPages]);

  const handleDrop = (target) => {
    if (dragPage != null && dragPage !== target) onReorder?.(dragPage, target);
    setDragPage(null);
    setOverPage(null);
  };

  if (!pdfJsDoc) return null;

  return (
    <div
      style={{
        flex: '0 0 auto',
        position: 'sticky',
        top: 24,
        width: THUMB_WIDTH + 32,
        maxHeight: 'calc(100vh - 48px)',
        overflowY: 'auto',
        padding: 12,
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
        background: T.pearl,
        border: `1px solid ${T.hairline}`,
        borderRadius: 14,
      }}
    >
      <span style={{ fontSize: 11, color: T.inkMuted48, textAlign: 'center', letterSpacing: '-0.1px' }}>
        Click to view · drag to reorder
      </span>
      {Array.from({ length: totalPages }, (_, i) => i + 1).map((n) => {
        const isCurrent = n === currentPage;
        const isOver = overPage === n && dragPage !== n;
        const isDragging = dragPage === n;
        return (
          <div
            key={n}
            draggable
            onClick={() => onSelect(n)}
            onDragStart={() => setDragPage(n)}
            onDragOver={(e) => { e.preventDefault(); if (overPage !== n) setOverPage(n); }}
            onDragLeave={() => setOverPage((p) => (p === n ? null : p))}
            onDrop={(e) => { e.preventDefault(); handleDrop(n); }}
            onDragEnd={() => { setDragPage(null); setOverPage(null); }}
            style={{
              cursor: 'grab',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 4,
              opacity: isDragging ? 0.4 : 1,
              borderTop: isOver ? `3px solid ${T.blue}` : '3px solid transparent',
              paddingTop: 2,
            }}
          >
            <canvas
              ref={(el) => { canvasRefs.current[n - 1] = el; }}
              style={{
                width: THUMB_WIDTH,
                display: 'block',
                background: T.canvas,
                borderRadius: 6,
                border: `2px solid ${isCurrent ? T.blue : T.hairline}`,
                boxShadow: isCurrent ? `0 0 0 1px ${T.blue}` : 'none',
                pointerEvents: 'none',
              }}
            />
            <span style={{ fontSize: 12, color: isCurrent ? T.blue : T.inkMuted48, fontWeight: isCurrent ? 600 : 400 }}>
              {n}
            </span>
          </div>
        );
      })}
    </div>
  );
}
