// Checkmark geometry, shared by the on-screen SVG preview and the baked PDF lines
// so what the user sees matches the output exactly. Points are relative to a
// square of side `s`, measured from the top-left corner (y grows downward).

export const tickPoints = (s) => [
  { x: 0.15 * s, y: 0.55 * s },
  { x: 0.40 * s, y: 0.82 * s },
  { x: 0.85 * s, y: 0.18 * s },
];

export const tickThickness = (s) => Math.max(1, s * 0.12);
