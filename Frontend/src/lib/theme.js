// Design tokens (Apple-design-analysis) + reusable style helpers.

export const T = {
  blue: '#0066cc',
  blueFocus: '#0071e3',
  ink: '#1d1d1f',
  inkMuted80: '#333333',
  inkMuted48: '#7a7a7a',
  hairline: '#e0e0e0',
  canvas: '#ffffff',
  parchment: '#f5f5f7',
  pearl: '#fafafc',
  display: "system-ui, -apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Segoe UI', sans-serif",
};

export const pillPrimary = (enabled) => ({
  padding: '11px 22px',
  background: enabled ? T.blue : '#aab1ba',
  color: '#fff',
  border: 'none',
  borderRadius: 9999,
  cursor: enabled ? 'pointer' : 'not-allowed',
  fontSize: 17,
  fontFamily: 'inherit',
  letterSpacing: '-0.374px',
});

export const pillGhost = (enabled) => ({
  padding: '11px 22px',
  background: 'transparent',
  color: enabled ? T.blue : '#aab1ba',
  border: `1px solid ${enabled ? T.blue : '#cfd4da'}`,
  borderRadius: 9999,
  cursor: enabled ? 'pointer' : 'not-allowed',
  fontSize: 17,
  fontFamily: 'inherit',
  letterSpacing: '-0.374px',
});

export const frostedBar = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 6,
  padding: '4px 8px',
  border: `1px solid ${T.blue}`,
  borderRadius: 11,
  background: 'rgba(255,255,255,0.92)',
  backdropFilter: 'saturate(180%) blur(8px)',
};

export const miniSelect = {
  fontSize: 12,
  padding: '2px 4px',
  cursor: 'pointer',
  border: `1px solid ${T.hairline}`,
  borderRadius: 8,
  background: T.canvas,
  color: T.ink,
  fontFamily: 'inherit',
};

export const toolBtn = (active) => ({
  fontSize: 12,
  fontWeight: 600,
  width: 24,
  height: 24,
  lineHeight: 1,
  cursor: 'pointer',
  border: `1px solid ${active ? T.blue : T.hairline}`,
  borderRadius: 8,
  background: active ? T.blue : T.canvas,
  color: active ? '#fff' : T.inkMuted80,
  fontFamily: 'inherit',
});
