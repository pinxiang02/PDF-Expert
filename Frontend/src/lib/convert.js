import { PDFDocument } from 'pdf-lib';

// Backend endpoint that runs LibreOffice headless. Override with VITE_CONVERT_API.
const CONVERT_API = import.meta.env.VITE_CONVERT_API || 'http://localhost:5174';

const IMAGE_EXT = ['jpg', 'jpeg', 'png'];
const OFFICE_EXT = ['doc', 'docx', 'ppt', 'pptx', 'xls', 'xlsx'];

export const ACCEPT_CONVERT =
  '.jpg,.jpeg,.png,.doc,.docx,.ppt,.pptx,.xls,.xlsx';

const ext = (name) => name.split('.').pop().toLowerCase();

export function isConvertible(fileName) {
  const e = ext(fileName);
  return IMAGE_EXT.includes(e) || OFFICE_EXT.includes(e);
}

// Wrap one image into a single-page PDF sized to the image. Returns Uint8Array.
async function imageToPdf(file) {
  const bytes = new Uint8Array(await file.arrayBuffer());
  const doc = await PDFDocument.create();
  const e = ext(file.name);
  const img = e === 'png' ? await doc.embedPng(bytes) : await doc.embedJpg(bytes);
  const page = doc.addPage([img.width, img.height]);
  page.drawImage(img, { x: 0, y: 0, width: img.width, height: img.height });
  return await doc.save();
}

// Send an Office document to the backend, receive PDF bytes back.
async function officeToPdf(file) {
  const form = new FormData();
  form.append('file', file);
  let res;
  try {
    res = await fetch(`${CONVERT_API}/convert`, { method: 'POST', body: form });
  } catch {
    throw new Error('Conversion server is not reachable. Start the backend (see Backend/README.md).');
  }
  if (!res.ok) {
    const msg = await res.text().catch(() => '');
    throw new Error(msg || `Conversion failed (${res.status}).`);
  }
  return new Uint8Array(await res.arrayBuffer());
}

// Convert any supported file to PDF bytes. Images run in-browser; Office files
// go through the LibreOffice backend.
export async function convertToPdf(file) {
  const e = ext(file.name);
  if (IMAGE_EXT.includes(e)) return imageToPdf(file);
  if (OFFICE_EXT.includes(e)) return officeToPdf(file);
  throw new Error(`Unsupported file type: .${e}`);
}
