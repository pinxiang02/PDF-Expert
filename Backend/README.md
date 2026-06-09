# PX PDF Editor — Conversion Backend

Converts Word / PowerPoint / Excel documents to PDF using a local
[LibreOffice](https://www.libreoffice.org/) install running in headless mode.
Image-to-PDF (JPG/PNG) is handled in the browser and does **not** need this server.

## Prerequisites

- Node.js 18+
- LibreOffice installed. Default lookup locations:
  - Windows: `C:\Program Files\LibreOffice\program\soffice.exe`
  - macOS: `/Applications/LibreOffice.app/Contents/MacOS/soffice`
  - Linux: `soffice` on `PATH`

  If yours is elsewhere, set the `SOFFICE_PATH` environment variable.

## Run

```bash
cd Backend
npm install
npm start
```

The server listens on `http://localhost:5174`. The frontend points there by
default; override with the `VITE_CONVERT_API` env var when building the frontend.

## Endpoints

- `GET /health` → `{ ok: true }`
- `POST /convert` (multipart form, field `file`) → PDF bytes

Uploads are capped at 25 MB and processed in an isolated temp directory that is
deleted after each request.
