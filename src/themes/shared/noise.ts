const PERM = new Uint8Array(512);
const GRAD = [
  [1, 1],
  [-1, 1],
  [1, -1],
  [-1, -1],
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
];

(function initNoise() {
  const p: number[] = [];
  for (let i = 0; i < 256; i += 1) {
    p[i] = i;
  }
  for (let i = 255; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [p[i], p[j]] = [p[j], p[i]];
  }
  for (let i = 0; i < 512; i += 1) {
    PERM[i] = p[i & 255];
  }
})();

export function noise2D(x: number, y: number): number {
  const X = Math.floor(x) & 255;
  const Y = Math.floor(y) & 255;
  const xf = x - Math.floor(x);
  const yf = y - Math.floor(y);
  const u = xf * xf * (3 - 2 * xf);
  const v = yf * yf * (3 - 2 * yf);
  const aa = PERM[PERM[X] + Y];
  const ab = PERM[PERM[X] + Y + 1];
  const ba = PERM[PERM[X + 1] + Y];
  const bb = PERM[PERM[X + 1] + Y + 1];
  const g = (h: number, dx: number, dy: number) => {
    const g2 = GRAD[h & 7];
    return g2[0] * dx + g2[1] * dy;
  };
  const x1 = g(aa, xf, yf) + u * (g(ba, xf - 1, yf) - g(aa, xf, yf));
  const x2 = g(ab, xf, yf - 1) + u * (g(bb, xf - 1, yf - 1) - g(ab, xf, yf - 1));
  return x1 + v * (x2 - x1);
}

export function fbm(x: number, y: number, octaves = 4): number {
  let val = 0;
  let amp = 0.5;
  let freq = 1;
  for (let i = 0; i < octaves; i += 1) {
    val += amp * noise2D(x * freq, y * freq);
    amp *= 0.5;
    freq *= 2;
  }
  return val;
}
