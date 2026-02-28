import type { ThemeRenderer } from "../types";

/** Data streams pulse along circuit traces while nodes light up as information flows through the network */
export const renderCircuit: ThemeRenderer = (ctx, w, h, t, mx, my) => {
  const gridSize = 40;
  const cols = Math.ceil(w / gridSize) + 1;
  const rows = Math.ceil(h / gridSize) + 1;

  // Faint PCB substrate grid
  ctx.lineWidth = 0.3;
  ctx.strokeStyle = "hsla(165, 30%, 30%, 0.015)";
  for (let x = 0; x < cols; x++) {
    ctx.beginPath();
    ctx.moveTo(x * gridSize, 0);
    ctx.lineTo(x * gridSize, h);
    ctx.stroke();
  }
  for (let y = 0; y < rows; y++) {
    ctx.beginPath();
    ctx.moveTo(0, y * gridSize);
    ctx.lineTo(w, y * gridSize);
    ctx.stroke();
  }

  // Circuit trace paths
  for (let i = 0; i < 25; i++) {
    const seed = i * 127.3;
    const startCol = Math.floor((Math.sin(seed) * 0.5 + 0.5) * cols);
    const startRow = Math.floor((Math.cos(seed * 1.4) * 0.5 + 0.5) * rows);

    ctx.beginPath();
    let cx2 = startCol * gridSize;
    let cy2 = startRow * gridSize;
    ctx.moveTo(cx2, cy2);

    let dir = Math.floor(seed * 10) % 4;
    for (let seg = 0; seg < 8; seg++) {
      const len = gridSize * (1 + Math.floor(Math.sin(seed + seg) * 2 + 2));
      const dirs = [[1, 0], [0, 1], [-1, 0], [0, -1]];
      cx2 += dirs[dir][0] * len;
      cy2 += dirs[dir][1] * len;
      ctx.lineTo(cx2, cy2);
      dir = (dir + (Math.sin(seed + seg * 3) > 0 ? 1 : 3)) % 4;
    }

    const pulse = (t * 0.5 + i * 0.3) % 3;
    const alpha = pulse < 1 ? 0.02 + pulse * 0.06 : pulse < 2 ? 0.08 - (pulse - 1) * 0.06 : 0.02;
    ctx.strokeStyle = `hsla(165, 70%, 55%, ${alpha})`;
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  // Nodes with component shapes at every 5th
  for (let i = 0; i < 30; i++) {
    const seed = i * 97.1;
    const nx = Math.floor((Math.sin(seed) * 0.5 + 0.5) * cols) * gridSize;
    const ny = Math.floor((Math.cos(seed * 1.3) * 0.5 + 0.5) * rows) * gridSize;
    const active = Math.sin(t * 0.8 + seed) > 0.3;
    const md = Math.hypot(nx - mx * w, ny - my * h);
    const mouseActive = md < 80;

    if (active || mouseActive) {
      const brightness = mouseActive ? 0.25 : 0.12;

      if (i % 5 === 0) {
        // Component shape (small rectangle)
        ctx.fillStyle = `hsla(165, 75%, 60%, ${brightness})`;
        ctx.fillRect(nx - 3, ny - 2, 6, 4);
        ctx.strokeStyle = `hsla(165, 70%, 55%, ${brightness * 0.5})`;
        ctx.lineWidth = 0.5;
        ctx.strokeRect(nx - 4, ny - 3, 8, 6);
      } else {
        ctx.beginPath();
        ctx.arc(nx, ny, 2, 0, Math.PI * 2);
        ctx.fillStyle = `hsla(165, 75%, 60%, ${brightness})`;
        ctx.fill();
      }

      ctx.beginPath();
      ctx.arc(nx, ny, mouseActive ? 12 : 8, 0, Math.PI * 2);
      ctx.fillStyle = `hsla(165, 70%, 55%, ${brightness * 0.2})`;
      ctx.fill();
    }
  }

  // Data particles with fading trails
  for (let i = 0; i < 15; i++) {
    const seed = i * 61.7;
    const progress = ((t * 0.4 + i * 0.7) % 4) / 4;
    const pathX = (Math.sin(seed) * 0.5 + 0.5) * w;
    const pathY = progress * h;

    // Fading trail
    for (let tr = 1; tr <= 4; tr++) {
      const trY = pathY - tr * 6;
      const trAlpha = 0.3 * (1 - tr / 5);
      ctx.beginPath();
      ctx.arc(pathX, trY, 1, 0, Math.PI * 2);
      ctx.fillStyle = `hsla(180, 70%, 60%, ${trAlpha * 0.4})`;
      ctx.fill();
    }

    // Main particle
    ctx.beginPath();
    ctx.arc(pathX, pathY, 1.5, 0, Math.PI * 2);
    ctx.fillStyle = "hsla(180, 80%, 65%, 0.3)";
    ctx.fill();
    ctx.beginPath();
    ctx.arc(pathX, pathY, 6, 0, Math.PI * 2);
    ctx.fillStyle = "hsla(180, 70%, 60%, 0.06)";
    ctx.fill();
  }
};
