import { useState, useRef, useCallback, useEffect } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import { T, pillGhost } from './lib/theme';
import { buildPdfBytes } from './lib/pdfBuild';
import { convertToPdf } from './lib/convert';
import { mergePdfs, reorderPdfPage } from './lib/merge';
import Toolbar from './components/Toolbar';
import Workspace from './components/Workspace';
import Thumbnails from './components/Thumbnails';
import SignatureModal from './components/SignatureModal';
import PreviewModal from './components/PreviewModal';
import WatermarkModal from './components/WatermarkModal';

pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;

const RENDER_SCALE = 1.5;
const ZOOM_STEP = 0.25;
const ZOOM_MIN = 0.5;
const ZOOM_MAX = 3;

function App() {
  const [pdfBuffer, setPdfBuffer] = useState(null);
  const [pdfJsDoc, setPdfJsDoc] = useState(null);
  const [totalPages, setTotalPages] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [fileName, setFileName] = useState('');
  const [items, setItems] = useState([]);
  const [pageDimensions, setPageDimensions] = useState({}); // pageNum -> { width, height } at RENDER_SCALE
  const [errorMessage, setErrorMessage] = useState('');
  const [previewUrl, setPreviewUrl] = useState(null);
  const [zoom, setZoom] = useState(1);
  const [showSignature, setShowSignature] = useState(false);
  const [showWatermark, setShowWatermark] = useState(false);
  const [watermark, setWatermark] = useState(null);
  const [converting, setConverting] = useState(false);
  const [selectedId, setSelectedId] = useState(null);
  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'light');

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  const canvasRef = useRef(null);
  const dragState = useRef(null);

  const renderPage = useCallback(async (doc, pageNum) => {
    const page = await doc.getPage(pageNum);
    const viewport = page.getViewport({ scale: RENDER_SCALE });
    setPageDimensions((prev) => ({ ...prev, [pageNum]: { width: viewport.width, height: viewport.height } }));

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    await page.render({ canvasContext: ctx, viewport }).promise;
  }, []);

  // Load raw PDF bytes into the editor (shared by upload and convert flows).
  const loadPdfBytes = async (arrayBuffer, name) => {
    setFileName(name);
    setItems([]);
    setWatermark(null);
    setZoom(1);

    // Keep the original bytes for pdf-lib; pdf.js detaches whatever buffer it receives.
    setPdfBuffer(arrayBuffer.slice(0));

    const doc = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    setPdfJsDoc(doc);
    setTotalPages(doc.numPages);
    setCurrentPage(1);
    await renderPage(doc, 1);
  };

  const handleFileUpload = async (e) => {
    setErrorMessage('');
    const file = e.target.files[0];
    if (!file || file.type !== 'application/pdf') {
      alert('Please upload a valid PDF file.');
      return;
    }
    try {
      await loadPdfBytes(await file.arrayBuffer(), file.name);
    } catch (err) {
      console.error('PDF render error:', err);
      setErrorMessage(`Failed to render PDF: ${err.message}`);
    }
  };

  const handleConvertUpload = async (e) => {
    setErrorMessage('');
    const file = e.target.files[0];
    e.target.value = ''; // allow re-selecting the same file
    if (!file) return;

    setConverting(true);
    try {
      const bytes = await convertToPdf(file);
      const pdfName = file.name.replace(/\.[^.]+$/, '.pdf');
      // bytes is a Uint8Array; hand pdf.js/pdf-lib their own ArrayBuffer copies.
      await loadPdfBytes(bytes.buffer.slice(0), pdfName);
    } catch (err) {
      console.error('Convert error:', err);
      setErrorMessage(`Failed to convert: ${err.message}`);
    } finally {
      setConverting(false);
    }
  };

  // Merge the selected PDFs (plus the one already open, if any) into a single
  // document and load the result. Page order follows: current doc, then files in
  // the order chosen.
  const handleMergeUpload = async (e) => {
    setErrorMessage('');
    const files = Array.from(e.target.files || []);
    e.target.value = '';
    if (!files.length) return;

    const invalid = files.find((f) => f.type !== 'application/pdf');
    if (invalid) { alert('Please select PDF files only.'); return; }

    const sources = [];
    if (pdfBuffer) sources.push(pdfBuffer.slice(0));
    for (const f of files) sources.push(await f.arrayBuffer());

    if (sources.length < 2) { alert('Select at least two PDFs to merge (or open one first, then add another).'); return; }

    try {
      const bytes = await mergePdfs(sources);
      const name = pdfBuffer ? `Merged_${fileName || 'document.pdf'}` : `Merged_${files[0].name}`;
      await loadPdfBytes(bytes.buffer.slice(0), name);
    } catch (err) {
      console.error('Merge error:', err);
      setErrorMessage(`Failed to merge PDFs: ${err.message}`);
    }
  };

  const goToPage = async (pageNum) => {
    if (!pdfJsDoc || pageNum < 1 || pageNum > totalPages) return;
    setCurrentPage(pageNum);
    try {
      await renderPage(pdfJsDoc, pageNum);
    } catch (err) {
      setErrorMessage(`Failed to render page ${pageNum}: ${err.message}`);
    }
  };

  // Reorder pages when a thumbnail is dragged. `from`/`to` are 1-based page
  // positions. Rebuilds the PDF and remaps overlays + dimensions to the new order.
  const reorderPages = async (from, to) => {
    if (!pdfBuffer || from === to) return;
    const fromIdx = from - 1;
    const toIdx = to - 1;
    try {
      const { bytes, order } = await reorderPdfPage(pdfBuffer, fromIdx, toIdx);
      // order[newIdx] = oldIdx → invert to map oldPage(1-based) → newPage(1-based).
      const oldToNew = {};
      order.forEach((oldIdx, newIdx) => { oldToNew[oldIdx + 1] = newIdx + 1; });

      setItems((prev) => prev.map((it) => ({ ...it, page: oldToNew[it.page || 1] || it.page })));
      setPageDimensions((prev) => {
        const next = {};
        for (const [oldPage, dims] of Object.entries(prev)) {
          const np = oldToNew[Number(oldPage)];
          if (np) next[np] = dims;
        }
        return next;
      });

      const newBuffer = bytes.buffer.slice(0);
      setPdfBuffer(newBuffer);
      const doc = await pdfjsLib.getDocument({ data: bytes.buffer.slice(0) }).promise;
      setPdfJsDoc(doc);
      setTotalPages(doc.numPages);
      const newCurrent = oldToNew[currentPage] || to;
      setCurrentPage(newCurrent);
      await renderPage(doc, newCurrent);
    } catch (err) {
      console.error('Reorder error:', err);
      setErrorMessage(`Failed to reorder pages: ${err.message}`);
    }
  };

  const addItem = (extra) => {
    if (!pdfBuffer) { alert('Upload a PDF first!'); return; }
    const id = Date.now() + Math.random();
    setItems((prev) => [...prev, { id, x: 50, y: 50, page: currentPage, ...extra }]);
    setSelectedId(id);
  };

  const textDefaults = { type: 'text', text: 'Type here...', fontSize: 14, fontFamily: 'Helvetica', bold: false, highlight: false };
  const addTextBox = () => addItem(textDefaults);
  const addTick = () => addItem({ type: 'tick', size: 24 });

  const addSignature = (dataUrl, w, h) => {
    const aspect = w / h;
    const width = Math.min(220, w);
    addItem({ type: 'signature', dataUrl, aspect, width, height: Math.round(width / aspect) });
    setShowSignature(false);
  };

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    e.target.value = ''; // allow re-selecting the same file
    if (!file) return;
    if (!['image/png', 'image/jpeg'].includes(file.type)) { alert('Please choose a PNG or JPG image.'); return; }
    if (!pdfBuffer) { alert('Upload a PDF first!'); return; }

    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result;
      const img = new Image();
      img.onload = () => {
        const aspect = img.naturalWidth / img.naturalHeight;
        const width = Math.min(280, img.naturalWidth);
        addItem({ type: 'image', dataUrl, aspect, width, height: Math.round(width / aspect) });
      };
      img.onerror = () => setErrorMessage('Could not load that image.');
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
  };

  const handleCanvasDoubleClick = (e) => {
    if (!pdfBuffer || e.target !== canvasRef.current) return;
    const r = canvasRef.current.getBoundingClientRect();
    addItem({ ...textDefaults, x: (e.clientX - r.left) / zoom, y: (e.clientY - r.top) / zoom });
  };

  const updateItem = (id, changes) => setItems((prev) => prev.map((it) => (it.id === id ? { ...it, ...changes } : it)));
  const deleteItem = (id) => {
    setItems((prev) => prev.filter((it) => it.id !== id));
    setSelectedId((cur) => (cur === id ? null : cur));
  };

  const onPointerDown = (e, item) => {
    e.preventDefault();
    e.target.setPointerCapture(e.pointerId);
    dragState.current = { id: item.id, startX: e.clientX, startY: e.clientY, origX: item.x, origY: item.y };
  };

  const onPointerMove = (e) => {
    const ds = dragState.current;
    if (!ds) return;
    const dims = pageDimensions[currentPage] || { width: 0, height: 0 };
    // Screen deltas are in zoomed pixels; divide by zoom to get canvas-space movement.
    let nx = ds.origX + (e.clientX - ds.startX) / zoom;
    let ny = ds.origY + (e.clientY - ds.startY) / zoom;
    nx = Math.max(0, Math.min(nx, dims.width - 10));
    ny = Math.max(0, Math.min(ny, dims.height - 10));
    updateItem(ds.id, { x: nx, y: ny });
  };

  const onPointerUp = (e) => {
    if (dragState.current) {
      try { e.target.releasePointerCapture(e.pointerId); } catch { /* pointer already released */ }
      dragState.current = null;
    }
  };

  const handlePreview = async () => {
    if (!pdfBuffer) return;
    try {
      const bytes = await buildPdfBytes(pdfBuffer, items, pageDimensions, watermark);
      const url = URL.createObjectURL(new Blob([bytes], { type: 'application/pdf' }));
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      setPreviewUrl(url);
    } catch (err) {
      console.error('PDF preview error:', err);
      alert(`Failed to generate preview: ${err.message}`);
    }
  };

  const closePreview = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
  };

  const handleDownload = async () => {
    if (!pdfBuffer) return;
    try {
      const bytes = await buildPdfBytes(pdfBuffer, items, pageDimensions, watermark);
      const url = URL.createObjectURL(new Blob([bytes], { type: 'application/pdf' }));
      const link = document.createElement('a');
      link.href = url;
      link.download = `Filled_${fileName}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('PDF save error:', err);
      alert(`Failed to save PDF: ${err.message}`);
    }
  };

  const zoomIn = () => setZoom((z) => Math.min(ZOOM_MAX, +(z + ZOOM_STEP).toFixed(2)));
  const zoomOut = () => setZoom((z) => Math.max(ZOOM_MIN, +(z - ZOOM_STEP).toFixed(2)));

  const canvasDims = pageDimensions[currentPage] || { width: 0, height: 0 };
  const visibleItems = items.filter((it) => (it.page || 1) === currentPage);
  const hasItems = items.length > 0;
  const hasOutput = hasItems || !!watermark;

  return (
    <div style={{ maxWidth: 1600, margin: '0 auto', padding: '40px 24px 64px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, marginBottom: 28 }}>
        <div>
          <h1 style={{ margin: '0 0 4px', fontFamily: T.display, fontSize: 40, fontWeight: 600, letterSpacing: '-0.28px', lineHeight: 1.1, color: T.ink }}>
            PDF Form Filler
          </h1>
          <p style={{ margin: 0, fontSize: 17, color: T.inkMuted48, letterSpacing: '-0.374px' }}>
            Upload or convert a file to PDF, add text, ticks, signatures and watermarks, then preview and download.
          </p>
        </div>
        <button
          onClick={() => setTheme((t) => (t === 'dark' ? 'light' : 'dark'))}
          title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          style={{ ...pillGhost(true), padding: '8px 16px', fontSize: 15, flexShrink: 0, whiteSpace: 'nowrap' }}
        >
          {theme === 'dark' ? '☀ Light' : '☾ Dark'}
        </button>
      </div>

      <div style={{ display: 'flex', gap: 24, alignItems: 'flex-start' }}>
        {pdfBuffer && totalPages > 1 && (
          <Thumbnails
            pdfJsDoc={pdfJsDoc}
            totalPages={totalPages}
            currentPage={currentPage}
            onSelect={goToPage}
            onReorder={reorderPages}
          />
        )}

        <div style={{ flex: 1, minWidth: 0 }}>
      <Toolbar
        pdfBuffer={pdfBuffer}
        fileName={fileName}
        hasOutput={hasOutput}
        hasWatermark={!!watermark}
        converting={converting}
        totalPages={totalPages}
        currentPage={currentPage}
        zoom={zoom}
        onUpload={handleFileUpload}
        onConvert={handleConvertUpload}
        onMerge={handleMergeUpload}
        onAddText={addTextBox}
        onAddTick={addTick}
        onAddImage={handleImageUpload}
        onAddSignature={() => setShowSignature(true)}
        onWatermark={() => setShowWatermark(true)}
        onPreview={handlePreview}
        onDownload={handleDownload}
        onPrevPage={() => goToPage(currentPage - 1)}
        onNextPage={() => goToPage(currentPage + 1)}
        onZoomIn={zoomIn}
        onZoomOut={zoomOut}
      />

      {pdfBuffer && (
        <div style={{ fontSize: 14, color: T.inkMuted48, marginBottom: 16, letterSpacing: '-0.224px' }}>
          Tip: double-click anywhere on the PDF to add a text box at that spot.
        </div>
      )}

      {errorMessage && (
        <div style={{ padding: '12px 16px', background: '#fff0f0', color: '#b00020', borderRadius: 11, marginBottom: 16, fontSize: 14, border: '1px solid #f3c2c2' }}>
          <strong>Error:</strong> {errorMessage}
        </div>
      )}

      <div style={{ overflowX: 'auto' }}>
        <Workspace
          canvasRef={canvasRef}
          pdfBuffer={pdfBuffer}
          canvasDims={canvasDims}
          zoom={zoom}
          items={visibleItems}
          errorMessage={errorMessage}
          selectedId={selectedId}
          onSelect={setSelectedId}
          onCanvasDoubleClick={handleCanvasDoubleClick}
          dragHandlers={{ onPointerDown, onPointerMove, onPointerUp }}
          onUpdate={updateItem}
          onDelete={deleteItem}
        />
      </div>

      {hasItems && (
        <div style={{ marginTop: 14, fontSize: 14, color: T.inkMuted48, letterSpacing: '-0.224px' }}>
          {items.length} item{items.length !== 1 ? 's' : ''} added
          {totalPages > 1 && ` across ${new Set(items.map((i) => i.page)).size} page(s)`}
        </div>
      )}
        </div>
      </div>

      {showSignature && <SignatureModal onCancel={() => setShowSignature(false)} onAdd={addSignature} />}
      {showWatermark && (
        <WatermarkModal
          current={watermark}
          onApply={(wm) => { setWatermark(wm); setShowWatermark(false); }}
          onRemove={() => { setWatermark(null); setShowWatermark(false); }}
          onCancel={() => setShowWatermark(false)}
        />
      )}
      {previewUrl && <PreviewModal url={previewUrl} fileName={fileName} onDownload={handleDownload} onClose={closePreview} />}
    </div>
  );
}

export default App;
