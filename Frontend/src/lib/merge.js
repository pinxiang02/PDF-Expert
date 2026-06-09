import { PDFDocument } from 'pdf-lib';

// Merge several PDFs (ArrayBuffers / Uint8Arrays) into one, preserving page
// order across sources. Returns the combined PDF as a Uint8Array.
export async function mergePdfs(sources) {
  const out = await PDFDocument.create();
  for (const src of sources) {
    const bytes = src instanceof Uint8Array ? src.slice(0) : src.slice(0);
    const doc = await PDFDocument.load(bytes);
    const copied = await out.copyPages(doc, doc.getPageIndices());
    copied.forEach((page) => out.addPage(page));
  }
  return out.save();
}

// Move the page at 0-based index `from` to 0-based index `to` within a PDF,
// preserving the document's structure. Returns { bytes, order } where `order`
// is the new sequence of original page indices (used to remap overlays).
export async function reorderPdfPage(pdfBuffer, from, to) {
  const doc = await PDFDocument.load(pdfBuffer.slice(0));
  const page = doc.getPage(from);
  doc.removePage(from);
  doc.insertPage(to, page);
  const bytes = await doc.save();

  const order = [...Array(doc.getPageCount()).keys()];
  order.splice(from, 1);
  order.splice(to, 0, from);

  return { bytes, order };
}
