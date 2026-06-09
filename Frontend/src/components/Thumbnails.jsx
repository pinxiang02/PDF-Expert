import { useEffect, useRef, useState } from 'react';
import { T } from '../lib/theme';

const THUMB_WIDTH = 132;

// Left-hand page navigator. Renders each PDF page into a small canvas using the
// shared pdf.js document, highlights the current page, and jumps to a page when
// its thumbnail is clicked. Pages can be dragged to reorder them (onReorder).
// Rendering runs sequentially so we never kick off two render tasks for the same
// page object at once.
export default function Thumbnails({ pdfJsDoc, totalPages, currentPage, pagesWithItems, onSelect, onReorder, onDeletePage, onRotatePage }) {
  const canvasRefs = useRef([]);
  const [dragPage, setDragPage] = useState(null);
  const [overPage, setOverPage] = useState(null);
  const [hoverPage, setHoverPage] = useState(null);

  const pageBtn = {
    width: 22, height: 22, borderRadius: 6, cursor: 'pointer', lineHeight: 1,
    fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'center',
    border: `1px solid ${T.hairline}`, background: 'rgba(255,255,255,0.95)', color: T.inkMuted80,
  };

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
        {totalPages > 1 ? 'Click to view · drag to reorder · hover for ⟳ ✕' : 'Hover a page for ⟳ rotate'}
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
            onMouseEnter={() => setHoverPage(n)}
            onMouseLeave={() => setHoverPage((p) => (p === n ? null : p))}
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
            <div style={{ position: 'relative', width: THUMB_WIDTH }}>
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
              {hoverPage === n && (
                <div style={{ position: 'absolute', top: 4, right: 4, display: 'flex', gap: 4 }}>
                  <button
                    title={pagesWithItems?.has(n) ? 'Remove annotations on this page before rotating' : 'Rotate 90°'}
                    onClick={(e) => { e.stopPropagation(); onRotatePage?.(n); }}
                    disabled={pagesWithItems?.has(n)}
                    style={{ ...pageBtn, opacity: pagesWithItems?.has(n) ? 0.4 : 1, cursor: pagesWithItems?.has(n) ? 'not-allowed' : 'pointer' }}
                  >
                    ⟳
                  </button>
                  <button
                    title={totalPages <= 1 ? 'Cannot delete the only page' : 'Delete page'}
                    onClick={(e) => { e.stopPropagation(); onDeletePage?.(n); }}
                    disabled={totalPages <= 1}
                    style={{ ...pageBtn, color: '#b00020', opacity: totalPages <= 1 ? 0.4 : 1, cursor: totalPages <= 1 ? 'not-allowed' : 'pointer' }}
                  >
                    ✕
                  </button>
                </div>
              )}
            </div>
            <span style={{ fontSize: 12, color: isCurrent ? T.blue : T.inkMuted48, fontWeight: isCurrent ? 600 : 400 }}>
              {n}
            </span>
          </div>
        );
      })}
    </div>
  );
}
