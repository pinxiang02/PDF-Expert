import { T } from '../lib/theme';

export default function ModalShell({ onBackdrop, children, style }) {
  return (
    <div
      onClick={onBackdrop}
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 1000, padding: 20,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: T.canvas, borderRadius: 18, overflow: 'hidden',
          display: 'flex', flexDirection: 'column', maxWidth: '100%', maxHeight: '100%',
          ...style,
        }}
      >
        {children}
      </div>
    </div>
  );
}
