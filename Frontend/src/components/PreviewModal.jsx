import ModalShell from './ModalShell';
import { T, pillPrimary, pillGhost } from '../lib/theme';

export default function PreviewModal({ url, fileName, onDownload, onClose }) {
  return (
    <ModalShell onBackdrop={onClose} style={{ width: '90%', height: '90%' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 20px', borderBottom: `1px solid ${T.hairline}`, background: T.parchment }}>
        <strong style={{ fontSize: 17, color: T.ink, fontWeight: 600, letterSpacing: '-0.374px' }}>
          Preview — Filled_{fileName}
        </strong>
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={onDownload} style={{ ...pillPrimary(true), padding: '8px 18px', fontSize: 15 }}>Download</button>
          <button onClick={onClose} style={{ ...pillGhost(true), padding: '8px 18px', fontSize: 15 }}>Close</button>
        </div>
      </div>
      <iframe title="PDF preview" src={url} style={{ flex: 1, border: 'none', width: '100%' }} />
    </ModalShell>
  );
}
