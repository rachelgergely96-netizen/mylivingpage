import React from "react";
import type { CSSProperties, ReactNode } from "react";
import {
  getThemeShareCardRecipe,
  type ShareCardArtAnchorId,
  type ShareCardFrameId,
  type ShareCardPrimitiveId,
  type ThemeShareCardRecipe,
} from "@/lib/share-card-art";
import type { ThemeId } from "@/themes/types";

interface ShareCardArtworkPalette {
  accent: string;
  accentBright: string;
  background: string;
  border: string;
  glow: string;
  surface: string;
}

export interface ShareCardThemeArtworkProps extends ShareCardArtworkPalette {
  className?: string;
  style?: CSSProperties;
  themeId: ThemeId;
}

const VIEWBOX_WIDTH = 1200;
const VIEWBOX_HEIGHT = 630;
const CENTER_X = VIEWBOX_WIDTH / 2;
const CENTER_Y = VIEWBOX_HEIGHT / 2;

function sequence(length: number): number[] {
  return Array.from({ length }, (_, index) => index);
}

function deterministicUnit(value: number): number {
  const wave = Math.sin(value * 12.9898 + 78.233) * 43758.5453;
  return wave - Math.floor(wave);
}

function deterministicRange(
  variant: number,
  index: number,
  minimum: number,
  maximum: number,
): number {
  return minimum + deterministicUnit(variant * 97 + index * 31) * (maximum - minimum);
}

function anchorOffset(anchor: ShareCardArtAnchorId): [number, number] {
  switch (anchor) {
    case "north-east":
      return [45, -92];
    case "center-right":
      return [36, 0];
    case "south-east":
      return [42, 92];
    case "center":
      return [-120, 0];
    case "south-west":
      return [-440, 92];
  }
}

function recipeTransform(recipe: ThemeShareCardRecipe, secondary = false): string {
  const [anchorX, anchorY] = anchorOffset(recipe.anchor);
  const scale = secondary ? recipe.scale * 0.84 : recipe.scale;
  const rotation = secondary ? recipe.rotation * -0.55 + 7 : recipe.rotation;
  const secondaryX = secondary ? -36 : 0;
  const secondaryY = secondary ? 26 : 0;

  return [
    `translate(${anchorX + secondaryX} ${anchorY + secondaryY})`,
    `translate(${CENTER_X} ${CENTER_Y})`,
    `rotate(${rotation})`,
    `scale(${scale})`,
    `translate(${-CENTER_X} ${-CENTER_Y})`,
  ].join(" ");
}

function renderOrbital(
  recipe: ThemeShareCardRecipe,
  palette: ShareCardArtworkPalette,
): ReactNode {
  const centerX = 925 + (recipe.variant % 5) * 12;
  const centerY = 278 + (recipe.variant % 7) * 7;
  const ringCount = 2 + recipe.density;

  return (
    <g>
      {sequence(ringCount).map((index) => (
        <ellipse
          key={`orbit-${index}`}
          cx={centerX}
          cy={centerY}
          rx={116 + index * 55}
          ry={44 + index * 25}
          fill="none"
          stroke={index % 2 === 0 ? palette.accent : palette.accentBright}
          strokeDasharray={index === ringCount - 1 ? "18 11" : undefined}
          strokeWidth={index === 0 ? 3 : 1.4}
          transform={`rotate(${recipe.variant * 7 + index * 18} ${centerX} ${centerY})`}
          vectorEffect="non-scaling-stroke"
        />
      ))}
      <circle
        cx={centerX}
        cy={centerY}
        r={28 + (recipe.variant % 4) * 5}
        fill={palette.glow}
        stroke={palette.accentBright}
        strokeWidth="1.5"
        vectorEffect="non-scaling-stroke"
      />
      {sequence(3 + recipe.density).map((index) => {
        const angle = (recipe.variant * 29 + index * (360 / (3 + recipe.density))) * (Math.PI / 180);
        const radius = 128 + index * 29;
        return (
          <rect
            key={`orbital-node-${index}`}
            x={centerX + Math.cos(angle) * radius - 4}
            y={centerY + Math.sin(angle) * radius * 0.5 - 4}
            width="8"
            height="8"
            fill={index % 2 === 0 ? palette.accentBright : palette.accent}
            transform={`rotate(45 ${centerX + Math.cos(angle) * radius} ${centerY + Math.sin(angle) * radius * 0.5})`}
          />
        );
      })}
    </g>
  );
}

function renderFlow(
  recipe: ThemeShareCardRecipe,
  palette: ShareCardArtworkPalette,
): ReactNode {
  const pathCount = 3 + recipe.density;
  const bend = 35 + (recipe.variant % 6) * 13;

  return (
    <g>
      {sequence(pathCount).map((index) => {
        const y = 105 + index * 78;
        const drift = ((recipe.variant + index) % 5 - 2) * 18;
        return (
          <path
            key={`flow-${index}`}
            d={`M 520 ${y} C 690 ${y - bend + drift}, 790 ${y + bend}, 930 ${y + drift} S 1110 ${y - bend}, 1250 ${y + 8}`}
            fill="none"
            stroke={index % 2 === 0 ? palette.accent : palette.accentBright}
            strokeWidth={index === Math.floor(pathCount / 2) ? 5 : 1.6}
            strokeOpacity={index === Math.floor(pathCount / 2) ? 0.9 : 0.58}
            vectorEffect="non-scaling-stroke"
          />
        );
      })}
      <path
        d={`M 630 590 C 760 ${460 - bend}, 980 ${520 + bend}, 1230 350`}
        fill="none"
        stroke={palette.glow}
        strokeWidth={42 + recipe.density * 8}
        strokeLinecap="square"
        vectorEffect="non-scaling-stroke"
      />
    </g>
  );
}

function renderParticles(
  recipe: ThemeShareCardRecipe,
  palette: ShareCardArtworkPalette,
): ReactNode {
  const count = 10 + recipe.density * 8;

  return (
    <g>
      {sequence(count).map((index) => {
        const x = deterministicRange(recipe.variant, index, 560, 1185);
        const y = deterministicRange(recipe.variant + 7, index, 35, 605);
        const size = deterministicRange(recipe.variant + 13, index, 2.5, 9);
        const shape = (recipe.variant + index) % 3;
        const color = index % 4 === 0 ? palette.accentBright : palette.accent;

        if (shape === 0) {
          return (
            <circle
              key={`particle-${index}`}
              cx={x}
              cy={y}
              r={size}
              fill={color}
              fillOpacity={0.35 + (index % 4) * 0.12}
            />
          );
        }

        if (shape === 1) {
          return (
            <rect
              key={`particle-${index}`}
              x={x - size / 2}
              y={y - size / 2}
              width={size}
              height={size}
              fill={color}
              fillOpacity={0.42 + (index % 3) * 0.14}
              transform={`rotate(45 ${x} ${y})`}
            />
          );
        }

        return (
          <line
            key={`particle-${index}`}
            x1={x}
            y1={y}
            x2={x + size * 3}
            y2={y - size * 2}
            stroke={color}
            strokeOpacity={0.46 + (index % 3) * 0.12}
            strokeWidth={Math.max(1, size / 3)}
            vectorEffect="non-scaling-stroke"
          />
        );
      })}
    </g>
  );
}

function renderGrid(
  recipe: ThemeShareCardRecipe,
  palette: ShareCardArtworkPalette,
): ReactNode {
  const horizon = 310 + (recipe.variant % 5) * 14;
  const vanishingX = 905 + (recipe.variant % 7) * 18;
  const rayCount = 5 + recipe.density * 2;
  const rowCount = 3 + recipe.density * 2;

  return (
    <g>
      {sequence(rayCount).map((index) => {
        const x = 520 + (index / (rayCount - 1)) * 750;
        return (
          <line
            key={`grid-ray-${index}`}
            x1={vanishingX}
            y1={horizon}
            x2={x}
            y2="660"
            stroke={index % 2 === 0 ? palette.accent : palette.border}
            strokeWidth="1.2"
            vectorEffect="non-scaling-stroke"
          />
        );
      })}
      {sequence(rowCount).map((index) => {
        const progress = (index + 1) / (rowCount + 1);
        const y = horizon + progress * progress * 325;
        return (
          <line
            key={`grid-row-${index}`}
            x1={580 - progress * 125}
            y1={y}
            x2={1210 + progress * 55}
            y2={y}
            stroke={index === rowCount - 1 ? palette.accentBright : palette.accent}
            strokeOpacity={0.36 + progress * 0.42}
            strokeWidth="1.2"
            vectorEffect="non-scaling-stroke"
          />
        );
      })}
      <path
        d={`M ${680 + (recipe.variant % 4) * 32} 88 H 1010 V 184 H 1122 V 260`}
        fill="none"
        stroke={palette.accentBright}
        strokeDasharray={recipe.variant % 2 === 0 ? "12 8" : undefined}
        strokeWidth="2"
        vectorEffect="non-scaling-stroke"
      />
      <rect
        x={1109}
        y={247}
        width="26"
        height="26"
        fill={palette.glow}
        stroke={palette.accentBright}
        strokeWidth="1.5"
        vectorEffect="non-scaling-stroke"
      />
    </g>
  );
}

function renderContour(
  recipe: ThemeShareCardRecipe,
  palette: ShareCardArtworkPalette,
): ReactNode {
  const layerCount = 3 + recipe.density;
  const skew = (recipe.variant % 7 - 3) * 9;

  return (
    <g>
      {sequence(layerCount).map((index) => {
        const inset = index * 34;
        const x = 610 + inset;
        const y = 76 + inset * 0.58;
        const width = 610 - inset * 1.25;
        const height = 500 - inset;
        return (
          <path
            key={`contour-${index}`}
            d={[
              `M ${x + width * 0.08} ${y}`,
              `L ${x + width * 0.72} ${y + skew}`,
              `L ${x + width} ${y + height * 0.26}`,
              `L ${x + width * 0.88} ${y + height * 0.78}`,
              `L ${x + width * 0.54} ${y + height}`,
              `L ${x + width * 0.09} ${y + height * 0.86}`,
              `L ${x} ${y + height * 0.34}`,
              "Z",
            ].join(" ")}
            fill={index === layerCount - 1 ? palette.glow : "none"}
            stroke={index % 2 === 0 ? palette.accent : palette.accentBright}
            strokeDasharray={index % 3 === 2 ? "15 9" : undefined}
            strokeWidth={index === 0 ? 2.2 : 1.3}
            vectorEffect="non-scaling-stroke"
          />
        );
      })}
      <path
        d={`M 580 ${500 + skew} C 740 ${390 - skew}, 900 ${590 + skew}, 1210 410`}
        fill="none"
        stroke={palette.accentBright}
        strokeWidth="3"
        vectorEffect="non-scaling-stroke"
      />
    </g>
  );
}

function renderFacets(
  recipe: ThemeShareCardRecipe,
  palette: ShareCardArtworkPalette,
): ReactNode {
  const shift = (recipe.variant % 6) * 13;
  const points = [
    `${640 + shift},80 ${850 + shift},52 ${790 + shift},260`,
    `${850 + shift},52 ${1110 + shift},112 ${790 + shift},260`,
    `${790 + shift},260 ${1110 + shift},112 ${1045 + shift},350`,
    `${640 + shift},80 ${790 + shift},260 ${585 + shift},365`,
    `${585 + shift},365 ${790 + shift},260 ${835 + shift},578`,
    `${790 + shift},260 ${1045 + shift},350 ${835 + shift},578`,
    `${1045 + shift},350 ${1195 + shift},500 ${835 + shift},578`,
  ];

  return (
    <g>
      {points.map((polygonPoints, index) => (
        <polygon
          key={`facet-${index}`}
          points={polygonPoints}
          fill={index % 3 === 0 ? palette.glow : index % 3 === 1 ? palette.surface : "none"}
          fillOpacity={0.42 + (index % 3) * 0.14}
          stroke={index % 2 === 0 ? palette.accent : palette.accentBright}
          strokeOpacity={0.72}
          strokeWidth={index === recipe.variant % points.length ? 3 : 1.2}
          vectorEffect="non-scaling-stroke"
        />
      ))}
      <line
        x1={620 + shift}
        y1="602"
        x2={1160 + shift}
        y2="18"
        stroke={palette.accentBright}
        strokeOpacity="0.65"
        strokeWidth="2"
        vectorEffect="non-scaling-stroke"
      />
    </g>
  );
}

function renderBotanical(
  recipe: ThemeShareCardRecipe,
  palette: ShareCardArtworkPalette,
): ReactNode {
  const stemX = 910 + (recipe.variant % 5) * 18;
  const leafCount = 3 + recipe.density;

  return (
    <g>
      <path
        d={`M ${stemX - 120} 650 C ${stemX - 80} 480, ${stemX + 30} 355, ${stemX + 95} 40`}
        fill="none"
        stroke={palette.accentBright}
        strokeWidth="3"
        vectorEffect="non-scaling-stroke"
      />
      {sequence(leafCount).map((index) => {
        const y = 500 - index * 82;
        const side = (index + recipe.variant) % 2 === 0 ? -1 : 1;
        const x = stemX - 25 + index * 25;
        const reach = 82 + index * 7;
        return (
          <g key={`leaf-${index}`}>
            <path
              d={`M ${x} ${y} C ${x + side * 28} ${y - 58}, ${x + side * reach} ${y - 64}, ${x + side * reach} ${y - 8} C ${x + side * 58} ${y + 4}, ${x + side * 25} ${y - 1}, ${x} ${y} Z`}
              fill={index % 2 === 0 ? palette.glow : palette.surface}
              stroke={index % 2 === 0 ? palette.accent : palette.accentBright}
              strokeWidth="1.5"
              vectorEffect="non-scaling-stroke"
            />
            <line
              x1={x}
              y1={y}
              x2={x + side * reach * 0.82}
              y2={y - 24}
              stroke={palette.accentBright}
              strokeOpacity="0.58"
              strokeWidth="1"
              vectorEffect="non-scaling-stroke"
            />
          </g>
        );
      })}
      <path
        d={`M ${stemX + 62} 126 C ${stemX - 5} 48, ${stemX + 142} 8, ${stemX + 178} 92 C ${stemX + 186} 168, ${stemX + 95} 190, ${stemX + 62} 126 Z`}
        fill={palette.glow}
        stroke={palette.accentBright}
        strokeWidth="2"
        vectorEffect="non-scaling-stroke"
      />
    </g>
  );
}

function renderArchitecture(
  recipe: ThemeShareCardRecipe,
  palette: ShareCardArtworkPalette,
): ReactNode {
  const towerCount = 3 + recipe.density;
  const baseline = 584;

  return (
    <g>
      {sequence(towerCount).map((index) => {
        const width = 72 + ((recipe.variant + index) % 4) * 18;
        const height = 205 + ((recipe.variant * 3 + index * 5) % 5) * 54;
        const x = 650 + index * 118;
        return (
          <g key={`tower-${index}`}>
            <path
              d={`M ${x} ${baseline} L ${x + 10} ${baseline - height} L ${x + width - 10} ${baseline - height - 24} L ${x + width} ${baseline} Z`}
              fill={index % 2 === 0 ? palette.surface : palette.glow}
              stroke={index % 2 === 0 ? palette.accent : palette.accentBright}
              strokeWidth="1.5"
              vectorEffect="non-scaling-stroke"
            />
            {sequence(2 + recipe.density).map((slitIndex) => (
              <line
                key={`tower-${index}-slit-${slitIndex}`}
                x1={x + 22}
                y1={baseline - height + 42 + slitIndex * 54}
                x2={x + width - 20}
                y2={baseline - height + 42 + slitIndex * 54}
                stroke={palette.accentBright}
                strokeOpacity="0.66"
                strokeWidth="3"
                vectorEffect="non-scaling-stroke"
              />
            ))}
          </g>
        );
      })}
      <path
        d={`M 595 ${baseline} Q 900 ${130 + (recipe.variant % 4) * 24} 1210 ${baseline}`}
        fill="none"
        stroke={palette.accentBright}
        strokeDasharray="16 12"
        strokeWidth="2"
        vectorEffect="non-scaling-stroke"
      />
      <line
        x1="560"
        y1={baseline}
        x2="1240"
        y2={baseline}
        stroke={palette.accent}
        strokeWidth="2"
        vectorEffect="non-scaling-stroke"
      />
    </g>
  );
}

function renderWeave(
  recipe: ThemeShareCardRecipe,
  palette: ShareCardArtworkPalette,
): ReactNode {
  const lineCount = 3 + recipe.density;
  const amplitude = 42 + (recipe.variant % 5) * 9;

  return (
    <g>
      {sequence(lineCount).map((index) => {
        const y = 120 + index * 92;
        return (
          <path
            key={`weave-horizontal-${index}`}
            d={`M 545 ${y} C 700 ${y - amplitude}, 855 ${y + amplitude}, 1010 ${y} S 1165 ${y - amplitude}, 1280 ${y}`}
            fill="none"
            stroke={index % 2 === 0 ? palette.accent : palette.accentBright}
            strokeWidth={index === recipe.variant % lineCount ? 3 : 1.3}
            vectorEffect="non-scaling-stroke"
          />
        );
      })}
      {sequence(lineCount).map((index) => {
        const x = 650 + index * 130;
        return (
          <path
            key={`weave-vertical-${index}`}
            d={`M ${x} 28 C ${x - amplitude} 175, ${x + amplitude} 330, ${x} 470 S ${x - amplitude} 610, ${x} 690`}
            fill="none"
            stroke={index % 2 === 0 ? palette.accentBright : palette.accent}
            strokeOpacity="0.64"
            strokeWidth="1.25"
            vectorEffect="non-scaling-stroke"
          />
        );
      })}
      <rect
        x="712"
        y="168"
        width="384"
        height="286"
        fill={palette.glow}
        stroke={palette.border}
        strokeWidth="1"
        transform={`rotate(${recipe.variant % 2 === 0 ? 4 : -4} 904 311)`}
        vectorEffect="non-scaling-stroke"
      />
    </g>
  );
}

function renderPrint(
  recipe: ThemeShareCardRecipe,
  palette: ShareCardArtworkPalette,
): ReactNode {
  const offset = 18 + (recipe.variant % 4) * 7;
  const plateRotation = (recipe.variant % 7) - 3;

  return (
    <g>
      <rect
        x={656 + offset}
        y={74 + offset}
        width="474"
        height="446"
        fill={palette.glow}
        stroke={palette.accent}
        strokeWidth="2"
        transform={`rotate(${plateRotation} 893 297)`}
        vectorEffect="non-scaling-stroke"
      />
      <rect
        x="632"
        y="50"
        width="474"
        height="446"
        fill="none"
        stroke={palette.accentBright}
        strokeWidth="1.5"
        transform={`rotate(${-plateRotation * 0.6} 869 273)`}
        vectorEffect="non-scaling-stroke"
      />
      <path
        d="M 592 94 V 48 H 638 M 1100 48 H 1146 V 94 M 1146 482 V 528 H 1100 M 638 528 H 592 V 482"
        fill="none"
        stroke={palette.accentBright}
        strokeWidth="2"
        vectorEffect="non-scaling-stroke"
      />
      {sequence(3 + recipe.density).map((index) => (
        <line
          key={`print-rule-${index}`}
          x1={702}
          y1={154 + index * 64}
          x2={1055 - index * 27}
          y2={154 + index * 64}
          stroke={index === 0 ? palette.accentBright : palette.accent}
          strokeOpacity={0.84 - index * 0.1}
          strokeWidth={index === 0 ? 4 : 1.5}
          vectorEffect="non-scaling-stroke"
        />
      ))}
    </g>
  );
}

function renderOrnament(
  recipe: ThemeShareCardRecipe,
  palette: ShareCardArtworkPalette,
): ReactNode {
  const centerX = 930 + (recipe.variant % 4) * 15;
  const centerY = 310;
  const spread = 160 + recipe.density * 26;

  return (
    <g>
      <path
        d={`M ${centerX} 28 C ${centerX - spread} 102, ${centerX - spread} 242, ${centerX} ${centerY} C ${centerX + spread} 378, ${centerX + spread} 520, ${centerX} 602`}
        fill="none"
        stroke={palette.accentBright}
        strokeWidth="2.5"
        vectorEffect="non-scaling-stroke"
      />
      <path
        d={`M ${centerX} 28 C ${centerX + spread} 102, ${centerX + spread} 242, ${centerX} ${centerY} C ${centerX - spread} 378, ${centerX - spread} 520, ${centerX} 602`}
        fill="none"
        stroke={palette.accent}
        strokeWidth="1.5"
        vectorEffect="non-scaling-stroke"
      />
      {sequence(2 + recipe.density).map((index) => {
        const radius = 54 + index * 42;
        return (
          <path
            key={`ornament-loop-${index}`}
            d={`M ${centerX - radius} ${centerY} C ${centerX - radius} ${centerY - radius}, ${centerX + radius} ${centerY - radius}, ${centerX + radius} ${centerY} C ${centerX + radius} ${centerY + radius}, ${centerX - radius} ${centerY + radius}, ${centerX - radius} ${centerY} Z`}
            fill={index === 0 ? palette.glow : "none"}
            stroke={index % 2 === 0 ? palette.accentBright : palette.accent}
            strokeDasharray={index > 1 ? "10 8" : undefined}
            strokeWidth="1.4"
            transform={`rotate(${recipe.variant * 3 + index * 12} ${centerX} ${centerY})`}
            vectorEffect="non-scaling-stroke"
          />
        );
      })}
      <rect
        x={centerX - 7}
        y={centerY - 7}
        width="14"
        height="14"
        fill={palette.accentBright}
        transform={`rotate(45 ${centerX} ${centerY})`}
      />
    </g>
  );
}

function renderAtmosphere(
  recipe: ThemeShareCardRecipe,
  palette: ShareCardArtworkPalette,
): ReactNode {
  const bandCount = 3 + recipe.density;
  const slope = (recipe.variant % 7 - 3) * 12;

  return (
    <g>
      {sequence(bandCount).map((index) => {
        const y = 110 + index * 96;
        return (
          <path
            key={`atmosphere-band-${index}`}
            d={`M 520 ${y + slope} C 735 ${y - 44}, 910 ${y + 38}, 1240 ${y - slope}`}
            fill="none"
            stroke={index % 2 === 0 ? palette.accent : palette.accentBright}
            strokeOpacity={0.28 + index * 0.11}
            strokeWidth={index === bandCount - 1 ? 4 : 1.4}
            vectorEffect="non-scaling-stroke"
          />
        );
      })}
      {sequence(4 + recipe.density * 2).map((index) => {
        const x = 630 + index * 86;
        const length = 72 + ((index + recipe.variant) % 4) * 38;
        return (
          <line
            key={`atmosphere-streak-${index}`}
            x1={x}
            y1={35 + (index % 3) * 42}
            x2={x - 74}
            y2={35 + (index % 3) * 42 + length}
            stroke={index % 3 === 0 ? palette.accentBright : palette.accent}
            strokeOpacity={0.35 + (index % 4) * 0.12}
            strokeWidth={index % 3 === 0 ? 3 : 1.2}
            vectorEffect="non-scaling-stroke"
          />
        );
      })}
      <path
        d={`M 560 ${520 + slope} L 1240 ${330 - slope} L 1240 ${440 - slope} L 560 ${610 + slope} Z`}
        fill={palette.glow}
        fillOpacity="0.48"
      />
    </g>
  );
}

function renderPrimitive(
  primitive: ShareCardPrimitiveId,
  recipe: ThemeShareCardRecipe,
  palette: ShareCardArtworkPalette,
): ReactNode {
  switch (primitive) {
    case "orbital":
      return renderOrbital(recipe, palette);
    case "flow":
      return renderFlow(recipe, palette);
    case "particles":
      return renderParticles(recipe, palette);
    case "grid":
      return renderGrid(recipe, palette);
    case "contour":
      return renderContour(recipe, palette);
    case "facets":
      return renderFacets(recipe, palette);
    case "botanical":
      return renderBotanical(recipe, palette);
    case "architecture":
      return renderArchitecture(recipe, palette);
    case "weave":
      return renderWeave(recipe, palette);
    case "print":
      return renderPrint(recipe, palette);
    case "ornament":
      return renderOrnament(recipe, palette);
    case "atmosphere":
      return renderAtmosphere(recipe, palette);
  }
}

function renderFrame(
  frame: ShareCardFrameId,
  palette: ShareCardArtworkPalette,
): ReactNode {
  const common = {
    fill: "none",
    strokeLinecap: "square" as const,
    vectorEffect: "non-scaling-stroke" as const,
  };

  switch (frame) {
    case "signal":
      return (
        <g>
          <path
            {...common}
            d="M 26 98 V 26 H 98 M 1102 26 H 1174 V 98 M 1174 532 V 604 H 1102 M 98 604 H 26 V 532"
            stroke={palette.accent}
            strokeWidth="2"
          />
          <path
            {...common}
            d="M 26 142 H 94 M 1106 142 H 1174 M 26 488 H 94 M 1106 488 H 1174"
            stroke={palette.border}
            strokeWidth="1"
          />
        </g>
      );
    case "cinematic":
      return (
        <g>
          <rect x="0" y="0" width="1200" height="18" fill={palette.surface} />
          <rect x="0" y="612" width="1200" height="18" fill={palette.surface} />
          <path
            {...common}
            d="M 34 38 H 360 M 840 38 H 1166 M 34 592 H 360 M 840 592 H 1166"
            stroke={palette.accent}
            strokeWidth="1.5"
          />
        </g>
      );
    case "folio":
      return (
        <g>
          <rect
            {...common}
            x="22"
            y="22"
            width="1156"
            height="586"
            stroke={palette.border}
            strokeWidth="1"
          />
          <rect
            {...common}
            x="31"
            y="31"
            width="1138"
            height="568"
            stroke={palette.accent}
            strokeOpacity="0.55"
            strokeWidth="1"
          />
          <path
            {...common}
            d="M 500 31 H 700 M 500 599 H 700"
            stroke={palette.accentBright}
            strokeWidth="2"
          />
        </g>
      );
    case "material":
      return (
        <g>
          <rect x="20" y="24" width="5" height="582" fill={palette.accent} />
          <rect x="32" y="24" width="1" height="582" fill={palette.border} />
          <rect x="20" y="112" width="17" height="38" fill={palette.accentBright} />
          <rect x="20" y="480" width="17" height="38" fill={palette.accentBright} />
          <line
            {...common}
            x1="52"
            y1="604"
            x2="1168"
            y2="604"
            stroke={palette.border}
            strokeWidth="1"
          />
        </g>
      );
    case "gallery":
      return (
        <path
          {...common}
          d="M 22 90 V 22 H 90 M 1110 22 H 1178 V 90 M 1178 540 V 608 H 1110 M 90 608 H 22 V 540 M 22 315 H 54 M 1146 315 H 1178 M 600 22 V 54 M 600 576 V 608"
          stroke={palette.accentBright}
          strokeWidth="1.5"
        />
      );
    case "instrument":
      return (
        <g>
          <path
            {...common}
            d="M 982 44 A 174 174 0 0 1 1156 218 M 44 472 A 128 128 0 0 0 172 600"
            stroke={palette.accent}
            strokeWidth="2"
          />
          {sequence(8).map((index) => {
            const x = 1010 + index * 21;
            return (
              <line
                {...common}
                key={`frame-tick-${index}`}
                x1={x}
                y1="34"
                x2={x}
                y2={index % 2 === 0 ? "54" : "46"}
                stroke={index % 2 === 0 ? palette.accentBright : palette.border}
                strokeWidth="1"
              />
            );
          })}
          <path
            {...common}
            d="M 24 92 V 24 H 92 M 1108 606 H 1176 V 538"
            stroke={palette.border}
            strokeWidth="1"
          />
        </g>
      );
  }
}

export function ShareCardThemeArtwork({
  accent,
  accentBright,
  background,
  border,
  className,
  glow,
  style,
  surface,
  themeId,
}: ShareCardThemeArtworkProps) {
  const recipe = getThemeShareCardRecipe(themeId);
  const palette = {
    accent,
    accentBright,
    background,
    border,
    glow,
    surface,
  };

  return (
    <div
      aria-hidden="true"
      className={className}
      data-share-card-theme={themeId}
      data-share-card-primitive={recipe.primitive}
      data-share-card-frame={recipe.frame}
      style={{
        bottom: 0,
        display: "flex",
        left: 0,
        overflow: "hidden",
        pointerEvents: "none",
        position: "absolute",
        right: 0,
        top: 0,
        ...style,
      }}
    >
      <svg
        aria-hidden="true"
        focusable="false"
        preserveAspectRatio="xMidYMid slice"
        viewBox={`0 0 ${VIEWBOX_WIDTH} ${VIEWBOX_HEIGHT}`}
        style={{
          display: "block",
          height: "100%",
          width: "100%",
        }}
      >
        <rect
          x="0"
          y="0"
          width={VIEWBOX_WIDTH}
          height={VIEWBOX_HEIGHT}
          fill={background}
          fillOpacity="0.12"
        />
        <g
          data-share-card-art-layer="frame"
          data-share-card-art-frame={recipe.frame}
          opacity="0.78"
        >
          {renderFrame(recipe.frame, palette)}
        </g>
        {recipe.secondaryPrimitive ? (
          <g
            data-share-card-art-layer="secondary"
            data-share-card-art-primitive={recipe.secondaryPrimitive}
            opacity={Math.max(0.12, recipe.opacity * 0.52)}
            transform={recipeTransform(recipe, true)}
          >
            {renderPrimitive(recipe.secondaryPrimitive, recipe, palette)}
          </g>
        ) : null}
        <g
          data-share-card-art-layer="primary"
          data-share-card-art-primitive={recipe.primitive}
          opacity={recipe.opacity}
          transform={recipe.mirror ? "translate(1800 0) scale(-1 1)" : undefined}
        >
          <g transform={recipeTransform(recipe)}>
            {renderPrimitive(recipe.primitive, recipe, palette)}
          </g>
        </g>
      </svg>
    </div>
  );
}
