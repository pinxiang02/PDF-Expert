import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PDFDocument } from 'pdf-lib';
import { mergePdfs, reorderPdfPage, deletePdfPage, rotatePdfPage } from './merge.js';

// Build a PDF with `n` pages; each page's width encodes its 1-based number
// (100 + index) so we can verify ordering after operations.
async function makePdf(n) {
  const doc = await PDFDocument.create();
  for (let i = 0; i < n; i++) doc.addPage([100 + i, 200]);
  return doc.save();
}

const widths = async (bytes) => {
  const doc = await PDFDocument.load(bytes);
  return doc.getPages().map((p) => Math.round(p.getSize().width));
};

test('mergePdfs concatenates pages in source order', async () => {
  const a = await makePdf(2); // widths 100,101
  const b = await makePdf(3); // widths 100,101,102
  const merged = await mergePdfs([a, b]);
  assert.deepEqual(await widths(merged), [100, 101, 100, 101, 102]);
});

test('reorderPdfPage moves a page and reports the new order', async () => {
  const pdf = await makePdf(4); // widths 100,101,102,103
  const { bytes, order } = await reorderPdfPage(pdf, 0, 2); // move page 0 -> index 2
  assert.deepEqual(order, [1, 2, 0, 3]);
  assert.deepEqual(await widths(bytes), [101, 102, 100, 103]);
});

test('deletePdfPage removes a page and reports remaining order', async () => {
  const pdf = await makePdf(3); // widths 100,101,102
  const { bytes, order } = await deletePdfPage(pdf, 1); // delete middle page
  assert.deepEqual(order, [0, 2]);
  assert.deepEqual(await widths(bytes), [100, 102]);
});

test('rotatePdfPage applies and accumulates rotation', async () => {
  const pdf = await makePdf(1);
  const once = await rotatePdfPage(pdf, 0); // +90
  let doc = await PDFDocument.load(once);
  assert.equal(doc.getPage(0).getRotation().angle, 90);

  const twice = await rotatePdfPage(once, 0); // +90 again
  doc = await PDFDocument.load(twice);
  assert.equal(doc.getPage(0).getRotation().angle, 180);
});
