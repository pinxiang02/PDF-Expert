import express from 'express';
import cors from 'cors';
import multer from 'multer';
import { execFile } from 'node:child_process';
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const PORT = process.env.PORT || 5174;
const MAX_BYTES = 25 * 1024 * 1024; // 25 MB upload cap

// Path to the LibreOffice executable. Override with SOFFICE_PATH if it lives
// somewhere non-standard. Defaults cover the common install locations.
function sofficeCandidates() {
  if (process.env.SOFFICE_PATH) return [process.env.SOFFICE_PATH];
  if (process.platform === 'win32') {
    return [
      'C:\\Program Files\\LibreOffice\\program\\soffice.exe',
      'C:\\Program Files (x86)\\LibreOffice\\program\\soffice.exe',
    ];
  }
  if (process.platform === 'darwin') {
    return ['/Applications/LibreOffice.app/Contents/MacOS/soffice'];
  }
  return ['/usr/bin/soffice', '/usr/bin/libreoffice', 'soffice'];
}

async function resolveSoffice() {
  for (const c of sofficeCandidates()) {
    try { await fs.access(c); return c; } catch { /* try next */ }
  }
  // Fall back to PATH lookup (last candidate is a bare command name).
  return sofficeCandidates().at(-1);
}

const ALLOWED = new Set([
  '.doc', '.docx', '.ppt', '.pptx', '.xls', '.xlsx',
]);

const app = express();
app.use(cors());

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: MAX_BYTES } });

app.get('/health', (_req, res) => res.json({ ok: true }));

app.post('/convert', upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).send('No file uploaded.');

  const ext = path.extname(req.file.originalname).toLowerCase();
  if (!ALLOWED.has(ext)) return res.status(400).send(`Unsupported file type: ${ext}`);

  // Each request gets an isolated temp dir; LibreOffice writes the PDF there.
  const workDir = await fs.mkdtemp(path.join(os.tmpdir(), 'pdfx-'));
  const inputPath = path.join(workDir, `input${ext}`);

  try {
    await fs.writeFile(inputPath, req.file.buffer);

    const soffice = await resolveSoffice();
    // A per-request profile dir avoids "LibreOffice is already running" clashes.
    const profileDir = path.join(workDir, 'profile');
    await new Promise((resolve, reject) => {
      execFile(
        soffice,
        [
          '--headless', '--norestore', '--nologo', '--nofirststartwizard',
          `-env:UserInstallation=file:///${profileDir.replace(/\\/g, '/')}`,
          '--convert-to', 'pdf', '--outdir', workDir, inputPath,
        ],
        { timeout: 120000 },
        (err, _stdout, stderr) => (err ? reject(new Error(stderr || err.message)) : resolve()),
      );
    });

    const pdfPath = path.join(workDir, 'input.pdf');
    const pdf = await fs.readFile(pdfPath);
    const outName = path.basename(req.file.originalname, ext) + '.pdf';
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(outName)}"`);
    res.send(pdf);
  } catch (err) {
    console.error('Conversion error:', err.message);
    res.status(500).send('Conversion failed. Make sure LibreOffice is installed (set SOFFICE_PATH if needed).');
  } finally {
    fs.rm(workDir, { recursive: true, force: true }).catch(() => {});
  }
});

app.use((err, _req, res, _next) => {
  if (err && err.code === 'LIMIT_FILE_SIZE') return res.status(413).send('File too large (max 25 MB).');
  console.error(err);
  res.status(500).send('Server error.');
});

app.listen(PORT, () => console.log(`Conversion server listening on http://localhost:${PORT}`));
