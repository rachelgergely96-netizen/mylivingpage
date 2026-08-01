import React from "react";
import type { CSSProperties } from "react";

interface ShareCardQrProps {
  matrix: boolean[][] | null;
  size: number;
  borderColor?: string;
  className?: string;
  style?: CSSProperties;
  title?: string;
}

const MIN_QUIET_ZONE_MODULES = 4;
const MODULE_COLOR = "#0A1628";

function isSquareMatrix(matrix: boolean[][] | null): matrix is boolean[][] {
  if (!matrix?.length) return false;
  return matrix.every((row) => row.length === matrix.length);
}

function countQuietZoneModules(matrix: boolean[][]): number {
  const side = matrix.length;
  let quietZone = 0;

  while (quietZone < Math.ceil(side / 2)) {
    const farEdge = side - quietZone - 1;
    let ringIsClear = true;

    for (let index = quietZone; index <= farEdge; index += 1) {
      if (
        matrix[quietZone]?.[index] ||
        matrix[farEdge]?.[index] ||
        matrix[index]?.[quietZone] ||
        matrix[index]?.[farEdge]
      ) {
        ringIsClear = false;
        break;
      }
    }

    if (!ringIsClear) break;
    quietZone += 1;
  }

  return quietZone;
}

function buildModulePath(matrix: boolean[][], offset: number): string {
  const commands: string[] = [];

  matrix.forEach((row, rowIndex) => {
    row.forEach((isDark, columnIndex) => {
      if (!isDark) return;
      commands.push(
        `M${columnIndex + offset} ${rowIndex + offset}h1v1h-1z`,
      );
    });
  });

  return commands.join("");
}

export function ShareCardQr({
  matrix,
  size,
  borderColor,
  className,
  style,
  title,
}: ShareCardQrProps) {
  const safeMatrix = isSquareMatrix(matrix) ? matrix : null;
  const matrixSide = safeMatrix?.length ?? 1;
  const existingQuietZone = safeMatrix
    ? countQuietZoneModules(safeMatrix)
    : 0;
  const addedQuietZone = Math.max(
    0,
    MIN_QUIET_ZONE_MODULES - existingQuietZone,
  );
  const viewBoxSide = matrixSide + addedQuietZone * 2;
  const modulePath = safeMatrix
    ? buildModulePath(safeMatrix, addedQuietZone)
    : "";
  const resolvedSize = Number.isFinite(size) && size > 0 ? size : 1;
  // Only announce the QR code when it actually rendered: an empty plate must
  // stay hidden from assistive tech even when a title was provided.
  const announceTitle = Boolean(title && safeMatrix);

  return (
    <div
      className={className}
      data-share-card-qr
      data-share-card-qr-state={safeMatrix ? "ready" : "empty"}
      style={{
        alignItems: "center",
        background: "#FFFFFF",
        border: borderColor ? `1px solid ${borderColor}` : undefined,
        boxSizing: "border-box",
        display: "flex",
        flex: "none",
        height: resolvedSize,
        justifyContent: "center",
        overflow: "hidden",
        width: resolvedSize,
        ...style,
      }}
    >
      <svg
        aria-hidden={announceTitle ? undefined : true}
        aria-label={announceTitle ? title : undefined}
        focusable="false"
        role={announceTitle ? "img" : undefined}
        shapeRendering="crispEdges"
        viewBox={`0 0 ${viewBoxSide} ${viewBoxSide}`}
        xmlns="http://www.w3.org/2000/svg"
        style={{
          display: "block",
          height: "100%",
          width: "100%",
        }}
      >
        {announceTitle ? <title>{title}</title> : null}
        <rect width={viewBoxSide} height={viewBoxSide} fill="#FFFFFF" />
        {modulePath ? <path d={modulePath} fill={MODULE_COLOR} /> : null}
      </svg>
    </div>
  );
}
