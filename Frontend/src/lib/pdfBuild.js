import { PDFDocument, rgb } from 'pdf-lib';
import { standardFontFor } from './fonts';
import { tickPoints, tickThickness } from './shapes';

// Bake all overlay items (text / signature / tick) into a fresh copy of the
// source PDF and return the resulting bytes. Item coordinates are stored in the
// on-screen canvas space (RENDER_SCALE); pageDimensions[page] holds that canvas
// size, which we use to map back into the PDF's real point space.
export async function buildPdfBytes(pdfBuffer, items, pageDimensions) {
  const doc = await PDFDocument.load(pdfBuffer.slice(0));

  // Many PDFs are fillable forms whose interactive field widgets render on top
  // of the page content. Flatten them first so our overlays draw on top and are
  // never hidden behind a form field.
  try {
    doc.getForm().flatten();
  } catch {
    // No form (or it can't be flattened) — drawing on the page content is fine.
  }

  const pages = doc.getPages();

  const fontCache = {};
  const getFont = async (family, bold) => {
    const key = `${family}-${bold}`;
    if (!fontCache[key]) fontCache[key] = await doc.embedFont(standardFontFor(family, bold));
    return fontCache[key];
  };

  for (const item of items) {
    const pageIndex = (item.page || 1) - 1;
    if (pageIndex >= pages.length) continue;

    const page = pages[pageIndex];
    const { width: pdfW, height: pdfH } = page.getSize();
    const dims = pageDimensions[item.page || 1];
    if (!dims) continue;

    const scaleX = pdfW / dims.width;
    const scaleY = pdfH / dims.height;

    if (item.type === 'signature') {
      const png = await doc.embedPng(item.dataUrl);
      const h = item.height * scaleY;
      page.drawImage(png, {
        x: item.x * scaleX,
        y: pdfH - (item.y * scaleY) - h,
        width: item.width * scaleX,
        height: h,
      });
      continue;
    }

    if (item.type === 'tick') {
      const pts = tickPoints(item.size);
      const toPdf = (p) => ({
        x: (item.x + p.x) * scaleX,
        y: pdfH - (item.y + p.y) * scaleY,
      });
      const thickness = Math.max(1, tickThickness(item.size) * scaleY);
      const [a, b, c] = pts.map(toPdf);
      page.drawLine({ start: a, end: b, thickness, color: rgb(0, 0, 0) });
      page.drawLine({ start: b, end: c, thickness, color: rgb(0, 0, 0) });
      continue;
    }

    // text
    const size = Math.max(1, item.fontSize * scaleY);
    const font = await getFont(item.fontFamily || 'Helvetica', item.bold);
    const x = item.x * scaleX;
    const y = pdfH - (item.y * scaleY) - (item.fontSize * scaleY);

    if (item.highlight && item.text) {
      const textW = font.widthOfTextAtSize(item.text, size);
      page.drawRectangle({
        x: x - 1,
        y: y - size * 0.18,
        width: textW + 2,
        height: size * 1.15,
        color: rgb(1, 0.92, 0.23),
      });
    }

    page.drawText(item.text, { x, y, size, font, color: rgb(0, 0, 0) });
  }

  return await doc.save();
}
