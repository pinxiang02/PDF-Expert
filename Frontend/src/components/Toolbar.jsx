import { T, pillPrimary, pillGhost } from '../lib/theme';
import { ACCEPT_CONVERT } from '../lib/convert';

const navBtn = (enabled) => ({ ...pillGhost(enabled), padding: '6px 14px', fontSize: 14 });
const label = { fontSize: 14, color: T.inkMuted80, textAlign: 'center', letterSpacing: '-0.224px' };

export default function Toolbar({
  pdfBuffer, fileName, hasOutput, hasWatermark, converting, totalPages, currentPage, zoom,
  onUpload, onConvert, onAddText, onAddTick, onAddSignature, onWatermark, onPreview, onDownload,
  onPrevPage, onNextPage, onZoomIn, onZoomOut,
}) {
  const en = !!pdfBuffer;
  return (
    <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap', marginBottom: 20 }}>
      <label style={pillGhost(true)}>
        Upload PDF
        <input type="file" accept="application/pdf" onChange={onUpload} style={{ display: 'none' }} />
      </label>

      <label style={converting ? pillGhost(false) : pillGhost(true)}>
        {converting ? 'Converting…' : 'Convert to PDF'}
        <input type="file" accept={ACCEPT_CONVERT} disabled={converting} onChange={onConvert} style={{ display: 'none' }} />
      </label>

      {fileName && (
        <span style={{ ...label, maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: T.inkMuted48 }}>
          {fileName}
        </span>
      )}

      <button onClick={onAddText} disabled={!en} style={pillGhost(en)}>Add Text</button>
      <button onClick={onAddTick} disabled={!en} style={pillGhost(en)}>Add Tick</button>
      <button onClick={onAddSignature} disabled={!en} style={pillGhost(en)}>Add Signature</button>
      <button onClick={onWatermark} disabled={!en} style={hasWatermark ? pillPrimary(en) : pillGhost(en)}>
        {hasWatermark ? 'Watermark ✓' : 'Watermark'}
      </button>
      <button onClick={onPreview} disabled={!en} style={pillGhost(en)}>Preview</button>
      <button onClick={onDownload} disabled={!en || !hasOutput} style={pillPrimary(en && hasOutput)}>
        Save &amp; Download
      </button>

      {en && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginLeft: 4 }}>
          <button onClick={onZoomOut} disabled={zoom <= 0.5} style={navBtn(zoom > 0.5)} title="Zoom out">−</button>
          <span style={{ ...label, minWidth: 48 }}>{Math.round(zoom * 100)}%</span>
          <button onClick={onZoomIn} disabled={zoom >= 3} style={navBtn(zoom < 3)} title="Zoom in">+</button>
        </div>
      )}

      {totalPages > 1 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginLeft: 4 }}>
          <button onClick={onPrevPage} disabled={currentPage === 1} style={navBtn(currentPage !== 1)}>◀</button>
          <span style={{ ...label, minWidth: 84 }}>Page {currentPage} / {totalPages}</span>
          <button onClick={onNextPage} disabled={currentPage === totalPages} style={navBtn(currentPage !== totalPages)}>▶</button>
        </div>
      )}
    </div>
  );
}
