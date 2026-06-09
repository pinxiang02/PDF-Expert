# PX PDF Editor

A browser-based PDF tool. Upload a PDF (or convert a Word / PowerPoint / Excel /
image file into one), then add text, ticks, signatures and watermarks, preview
the result, and download it — all with an Apple-inspired interface.

## Live demo

**[https://pdf-expert-virid.vercel.app/](https://pdf-expert-virid.vercel.app/)**

The hosted demo runs the frontend on Vercel, so everything that works in the
browser is available: PDF editing, watermarks, image → PDF, camera scanning,
signatures, and dark mode. Word/PowerPoint/Excel conversion needs the LibreOffice
backend running and reachable (see [Backend setup](#2-backend-optional--only-for-office--pdf)).

## Install on a phone (PWA)

The app is a Progressive Web App, so you can install it to your home screen and
run it full-screen like a native app — no App Store needed.

**iPhone / iPad (Safari):** open the [live demo](https://pdf-expert-virid.vercel.app/),
tap the **Share** button, then **Add to Home Screen**. Launch it from the new icon.

**Android (Chrome):** open the site, then use the **Install app** / **Add to Home
Screen** prompt in the browser menu.

The camera scanner, editing, watermarks and image conversion all work on-device.
Office → PDF conversion still requires the LibreOffice backend to be reachable.

## Features

- **Edit PDFs** — place text boxes (font, size, bold, highlight), tick marks,
  images (PNG/JPG), and hand-drawn signatures anywhere on the page; drag to
  reposition and resize; multi-page support.
- **Watermark** — stamp configurable text (size, opacity, rotation, color) across
  every page.
- **Merge PDFs** — combine two or more PDFs (or add files to the one you have
  open) into a single document.
- **Page management** — drag thumbnails to reorder pages, or hover a thumbnail to
  rotate (90°) or delete a page.
- **Undo / redo** — revert structural edits (add/move/delete overlays, page
  reorder/delete/rotate, merge, watermark) with the toolbar buttons or
  `Ctrl/Cmd+Z` and `Ctrl/Cmd+Y`. `Delete` removes the selected overlay.
- **Scan with camera** — capture multiple photos with your device camera and
  combine them into a multi-page PDF (great on phones). Runs fully in the browser.
- **Convert to PDF**
  - **Images** (`.jpg`, `.jpeg`, `.png`) — converted entirely in your browser.
  - **Office docs** (`.doc`, `.docx`, `.ppt`, `.pptx`, `.xls`, `.xlsx`) — converted
    by a local backend running LibreOffice.
- **Installable (PWA)** — add it to your home screen and run it full-screen like a
  native app (see [Install on a phone](#install-on-a-phone-pwa)).
- **Preview & download** the finished PDF.

## Project layout

```
PDF/
├── Frontend/   React + Vite app (the UI; runs everything except Office conversion)
└── Backend/    Express + LibreOffice server (Office-to-PDF conversion only)
```

## Prerequisites

- [Node.js](https://nodejs.org/) 18 or newer (includes `npm`).
- [LibreOffice](https://www.libreoffice.org/) — **only** needed if you want to
  convert Word/PowerPoint/Excel files. Not required for editing, watermarks, or
  image conversion.

## Setup

### 1. Frontend (required)

```bash
cd Frontend
npm install
npm run dev
```

Open the URL Vite prints (typically `http://localhost:5173`). This is all you need
for editing PDFs, watermarks, and converting images.

To create a production build instead:

```bash
npm run build      # outputs to Frontend/dist
npm run preview    # serve the build locally
```

Run the unit tests (page merge / reorder / delete / rotate logic):

```bash
npm test
```

### 2. Backend (optional — only for Office → PDF)

Install LibreOffice first. The server looks for it in the standard locations:

- Windows: `C:\Program Files\LibreOffice\program\soffice.exe`
- macOS: `/Applications/LibreOffice.app/Contents/MacOS/soffice`
- Linux: `soffice` on your `PATH`

If yours is elsewhere, set the `SOFFICE_PATH` environment variable.

Then start the server:

```bash
cd Backend
npm install
npm start
```

It listens on `http://localhost:5174`. The frontend points there automatically.
Leave it running while you use the app.

## Configuration

| Variable          | Where    | Default                  | Purpose                                            |
|-------------------|----------|--------------------------|----------------------------------------------------|
| `VITE_CONVERT_API`| Frontend | `http://localhost:5174`  | URL of the conversion backend.                     |
| `PORT`            | Backend  | `5174`                   | Port the conversion server listens on.             |
| `SOFFICE_PATH`    | Backend  | auto-detected            | Path to the LibreOffice `soffice` executable.      |

If you change the backend `PORT`, set `VITE_CONVERT_API` to match before building
the frontend. Example (PowerShell):

```powershell
$env:VITE_CONVERT_API = "http://localhost:6000"
npm run build
```

## How conversion works

- **Images** are embedded into a new single-page PDF in the browser using
  [`pdf-lib`](https://pdf-lib.js.org/) — nothing leaves your machine.
- **Office documents** are uploaded to the backend, which runs LibreOffice in
  headless mode (`soffice --headless --convert-to pdf`) inside an isolated temp
  directory that is deleted after each request. Uploads are capped at 25 MB.

In both cases the resulting PDF loads straight into the editor, so you can add
text, signatures, or a watermark before downloading.

## Tech stack

- **Frontend:** React 19, Vite, `pdf-lib` (writing), `pdfjs-dist` (rendering).
- **Backend:** Express, Multer, LibreOffice (headless).

## Troubleshooting

- **"Conversion server is not reachable"** — the backend isn't running. Start it
  with `cd Backend && npm start`.
- **"Conversion failed. Make sure LibreOffice is installed"** — LibreOffice isn't
  found. Install it, or set `SOFFICE_PATH` to the `soffice` executable.
- **Office conversion hangs once, then works** — LibreOffice's first headless run
  initializes a user profile; subsequent runs are faster.
