import { useEffect, useRef } from 'react';
import { T } from '../lib/theme';

const THUMB_WIDTH = 132;

// Left-hand page navigator. Renders each PDF page into a small canvas using the
// shared pdf.js document, highlights the current page, and jumps to a page when
// its thumbnail is clicked. Rendering runs sequentially so we never kick off two
// render tasks for the same page object at once.
export default function Thumbnails({ pdfJsDoc, totalPages, currentPage, onSelect }) {
  const canvasRefs = useRef([]);

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
      {Array.from({ length: totalPages }, (_, i) => i + 1).map((n) => {
        const isCurrent = n === currentPage;
        return (
          <div
            key={n}
            onClick={() => onSelect(n)}
            style={{ cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}
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
