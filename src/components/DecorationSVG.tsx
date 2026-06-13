'use client';

import React from 'react';
import {
  decorationScale,
  type Decoration,
  type PlantVariant,
} from '@/lib/furniture';

function PlantPotSVG({
  x,
  y,
  width = 22,
  height = 18,
}: {
  x: number;
  y: number;
  width?: number;
  height?: number;
}) {
  const left = x - width / 2;
  return (
    <>
      <rect x={left - 2} y={y} width={width + 4} height={5} fill="#9a6840" rx={1} />
      <rect x={left} y={y + 4} width={width} height={height - 4} fill="#7a5230" rx={1} />
      <rect x={left + 3} y={y + height} width={width - 6} height={3} fill="#4a2e18" />
      <rect x={left + 3} y={y + 6} width={4} height={height - 6} fill="#a46f45" opacity={0.45} />
    </>
  );
}

function CactusSVG({ x, y }: { x: number; y: number }) {
  return (
    <>
      <rect x={x - 7} y={y - 42} width={14} height={62} fill="#3f7a45" rx={6} />
      <rect x={x - 4} y={y - 39} width={3} height={56} fill="#6a9a58" opacity={0.6} />
      <rect x={x - 23} y={y - 21} width={18} height={9} fill="#3f7a45" rx={4} />
      <rect x={x - 23} y={y - 34} width={9} height={21} fill="#3f7a45" rx={4} />
      <rect x={x + 5} y={y - 12} width={20} height={9} fill="#4a864c" rx={4} />
      <rect x={x + 16} y={y - 27} width={9} height={21} fill="#4a864c" rx={4} />
      <rect x={x - 1} y={y - 31} width={2} height={4} fill="#d2c59a" />
      <rect x={x + 2} y={y - 9} width={2} height={4} fill="#d2c59a" />
      <rect x={x - 18} y={y - 25} width={2} height={4} fill="#d2c59a" />
      <PlantPotSVG x={x} y={y + 17} width={28} height={20} />
    </>
  );
}

function MaidenhairFernSVG({ x, y }: { x: number; y: number }) {
  return (
    <>
      <rect x={x - 1} y={y - 25} width={2} height={47} fill="#222820" />
      <rect x={x - 18} y={y - 23} width={2} height={39} fill="#222820" transform={`rotate(-28 ${x - 17} ${y + 16})`} />
      <rect x={x + 16} y={y - 27} width={2} height={43} fill="#222820" transform={`rotate(31 ${x + 17} ${y + 16})`} />
      <rect x={x - 28} y={y - 12} width={2} height={31} fill="#222820" transform={`rotate(-51 ${x - 27} ${y + 16})`} />
      <rect x={x + 27} y={y - 13} width={2} height={32} fill="#222820" transform={`rotate(52 ${x + 28} ${y + 16})`} />
      {[
        [-31, -22], [-24, -31], [-14, -36], [-4, -42], [7, -39],
        [18, -34], [29, -24], [-35, -9], [-23, -13], [-11, -18],
        [10, -19], [22, -13], [35, -8], [-16, -3], [15, -4],
      ].map(([dx, dy], index) => (
        <rect
          key={index}
          x={x + dx - 4}
          y={y + dy - 3}
          width={8}
          height={6}
          fill={index % 3 === 0 ? '#73a95d' : '#5b914d'}
          rx={3}
        />
      ))}
      <PlantPotSVG x={x} y={y + 17} width={28} height={20} />
    </>
  );
}

function SpiderPlantSVG({ x, y }: { x: number; y: number }) {
  return (
    <>
      <polygon points={`${x - 3},${y + 18} ${x - 34},${y - 31} ${x - 28},${y - 33} ${x + 2},${y + 15}`} fill="#6f9e4f" />
      <polygon points={`${x - 1},${y + 17} ${x - 18},${y - 40} ${x - 11},${y - 41} ${x + 3},${y + 16}`} fill="#86ad5a" />
      <polygon points={`${x + 1},${y + 17} ${x + 2},${y - 43} ${x + 9},${y - 42} ${x + 5},${y + 17}`} fill="#5e9147" />
      <polygon points={`${x + 3},${y + 18} ${x + 24},${y - 38} ${x + 30},${y - 35} ${x + 7},${y + 19}`} fill="#7da653" />
      <polygon points={`${x + 5},${y + 18} ${x + 38},${y - 20} ${x + 41},${y - 14} ${x + 8},${y + 20}`} fill="#5e9147" />
      <polygon points={`${x - 5},${y + 18} ${x - 43},${y - 14} ${x - 39},${y - 19} ${x - 2},${y + 16}`} fill="#5e9147" />
      <rect x={x - 28} y={y - 30} width={3} height={33} fill="#d5df8c" transform={`rotate(-33 ${x - 27} ${y + 3})`} opacity={0.7} />
      <rect x={x + 23} y={y - 34} width={3} height={38} fill="#d5df8c" transform={`rotate(24 ${x + 24} ${y + 4})`} opacity={0.7} />
      <PlantPotSVG x={x} y={y + 17} width={30} height={20} />
    </>
  );
}

function MonsteraSVG({ x, y }: { x: number; y: number }) {
  return (
    <>
      <rect x={x - 2} y={y - 25} width={4} height={46} fill="#31572c" />
      <rect x={x - 18} y={y - 20} width={3} height={34} fill="#31572c" transform={`rotate(-24 ${x - 16} ${y + 14})`} />
      <rect x={x + 16} y={y - 25} width={3} height={39} fill="#31572c" transform={`rotate(25 ${x + 17} ${y + 14})`} />
      <polygon points={`${x - 4},${y - 43} ${x - 18},${y - 34} ${x - 21},${y - 18} ${x - 10},${y - 7} ${x},${y - 17} ${x + 10},${y - 7} ${x + 21},${y - 18} ${x + 18},${y - 34} ${x + 4},${y - 43}`} fill="#3e7d48" />
      <polygon points={`${x - 22},${y - 30} ${x - 38},${y - 23} ${x - 41},${y - 8} ${x - 30},${y + 1} ${x - 17},${y - 7} ${x - 12},${y - 21}`} fill="#4f8b52" />
      <polygon points={`${x + 21},${y - 34} ${x + 39},${y - 25} ${x + 41},${y - 10} ${x + 29},${y} ${x + 16},${y - 9} ${x + 13},${y - 23}`} fill="#4a864c" />
      <rect x={x - 2} y={y - 39} width={4} height={22} fill="#8fb36a" opacity={0.65} />
      <rect x={x - 32} y={y - 19} width={12} height={4} fill="#234b31" />
      <rect x={x + 20} y={y - 21} width={13} height={4} fill="#234b31" />
      <rect x={x - 13} y={y - 28} width={4} height={9} fill="#234b31" />
      <rect x={x + 9} y={y - 30} width={4} height={10} fill="#234b31" />
      <PlantPotSVG x={x} y={y + 17} width={30} height={21} />
    </>
  );
}

function UmbrellaTreeSVG({ x, y }: { x: number; y: number }) {
  const leafClusters = [
    { cx: x - 18, cy: y - 31 },
    { cx: x + 2, cy: y - 43 },
    { cx: x + 22, cy: y - 27 },
    { cx: x - 4, cy: y - 16 },
  ];
  return (
    <>
      <rect x={x - 4} y={y - 35} width={8} height={58} fill="#6b4a2d" />
      <rect x={x - 2} y={y - 32} width={3} height={54} fill="#9a6840" opacity={0.55} />
      {leafClusters.map(({ cx, cy }, clusterIndex) => (
        <g key={clusterIndex}>
          <rect x={cx - 4} y={cy - 4} width={8} height={8} fill="#31572c" />
          <rect x={cx - 20} y={cy - 5} width={16} height={10} fill="#4a7838" rx={4} />
          <rect x={cx + 4} y={cy - 5} width={16} height={10} fill="#5a8a44" rx={4} />
          <rect x={cx - 7} y={cy - 17} width={14} height={13} fill="#4f8446" rx={5} />
          <rect x={cx - 7} y={cy + 4} width={14} height={13} fill="#3f713b" rx={5} />
        </g>
      ))}
      <PlantPotSVG x={x} y={y + 19} width={32} height={22} />
    </>
  );
}

function PlantSVG({
  x,
  y,
  variant = 'monstera',
}: {
  x: number;
  y: number;
  variant?: PlantVariant;
}) {
  const content = (() => {
    switch (variant) {
      case 'cactus':
        return <CactusSVG x={x} y={y} />;
      case 'maidenhair-fern':
        return <MaidenhairFernSVG x={x} y={y} />;
      case 'spider-plant':
        return <SpiderPlantSVG x={x} y={y} />;
      case 'umbrella-tree':
        return <UmbrellaTreeSVG x={x} y={y} />;
      case 'monstera':
      default:
        return <MonsteraSVG x={x} y={y} />;
    }
  })();

  return <g data-plant-variant={variant}>{content}</g>;
}

function PlantDecorationSVG({
  x,
  y,
  variant,
}: {
  x: number;
  y: number;
  variant?: PlantVariant;
}) {
  return (
    <g
      data-base-size="plant-0.5"
      transform={`translate(${x},${y}) scale(0.5) translate(${-x},${-y})`}
    >
      <PlantSVG x={x} y={y} variant={variant} />
    </g>
  );
}

function LampSVG({ x, y, color = '#c8a060' }: { x: number; y: number; color?: string }) {
  return (
    <>
      <rect x={x - 8} y={y + 2} width={16} height={4} fill="#3a3020" />
      <rect x={x - 3} y={y - 8} width={6} height={12} fill="#4a4030" />
      <rect x={x - 14} y={y - 14} width={28} height={8} fill={color} rx={4} />
      <rect
        x={x - 18}
        y={y + 4}
        width={36}
        height={20}
        fill={color}
        opacity={0.06}
        rx={4}
      />
    </>
  );
}

function FloorLampSVG({ x, y, color = '#c8a060' }: { x: number; y: number; color?: string }) {
  return (
    <>
      <rect x={x - 2} y={y - 31} width={4} height={75} fill="#5a5040" />
      <rect x={x - 5} y={y - 34} width={10} height={5} fill="#3a3020" />
      <rect x={x - 25} y={y - 48} width={50} height={20} fill={color} rx={3} />
      <rect x={x - 19} y={y - 44} width={38} height={4} fill="#f5df91" opacity={0.55} />
      <rect x={x - 14} y={y - 28} width={28} height={29} fill={color} opacity={0.08} />
      <rect x={x - 17} y={y + 42} width={34} height={6} fill="#3a3020" rx={2} />
      <rect x={x - 11} y={y + 39} width={22} height={4} fill="#5a5040" />
    </>
  );
}

function SideTableSVG({ x, y, color = '#4a3820' }: { x: number; y: number; color?: string }) {
  return (
    <>
      <rect
        x={x - 22}
        y={y - 20}
        width={54}
        height={54}
        fill="#00000030"
        rx={2}
      />
      <rect
        x={x - 26}
        y={y - 24}
        width={54}
        height={54}
        fill="#3d2e1a"
        rx={2}
      />
      <rect x={x - 22} y={y - 20} width={46} height={46} fill={color} rx={1} />
      <rect
        x={x - 20}
        y={y - 18}
        width={42}
        height={5}
        fill="#5a4830"
        opacity={0.4}
      />
      <rect x={x - 22} y={y + 22} width={6} height={8} fill="#2a1e0e" />
      <rect x={x + 16} y={y + 22} width={6} height={8} fill="#2a1e0e" />
      <g transform={`translate(${x},${y - 6}) scale(0.42) translate(${-x},${-(y - 6)})`}>
        <PlantSVG x={x} y={y - 6} variant="cactus" />
      </g>
    </>
  );
}

/** Flat rug/carpet on the floor. */
function RugSVG({ x, y, color = '#4a3820' }: { x: number; y: number; color?: string }) {
  const w = 80;
  const h = 50;
  return (
    <>
      <rect x={x - w / 2 - 2} y={y - h / 2 - 2} width={w + 4} height={h + 4} fill="#1a1510" rx={4} />
      <rect x={x - w / 2} y={y - h / 2} width={w} height={h} fill={color} rx={3} />
      <rect x={x - w / 2 + 4} y={y - h / 2 + 4} width={w - 8} height={h - 8} fill="#3a3028" opacity={0.6} rx={2} />
      <rect x={x - w / 2 + 8} y={y - h / 2 + 8} width={w - 16} height={h - 16} fill={color} opacity={0.9} rx={2} />
    </>
  );
}

function TvSVG({ x, y, color = '#0d1a2e' }: { x: number; y: number; color?: string }) {
  return (
    <>
      <rect
        x={x - 80}
        y={y + 6}
        width={160}
        height={30}
        fill={color}
        opacity={0.35}
        rx={0}
      />
      <rect x={x - 4} y={y - 2} width={8} height={8} fill="#333" />
      <rect x={x - 80} y={y - 12} width={160} height={20} fill="#111" />
      <rect x={x - 78} y={y - 10} width={156} height={16} fill="#0a0a0a" />
      <rect x={x - 74} y={y - 8} width={148} height={12} fill={color} />
      <rect
        x={x - 60}
        y={y - 7}
        width={120}
        height={10}
        fill={color}
        opacity={0.8}
      />
      {/* Play icon (rect approximation) */}
      <rect x={x - 8} y={y - 5} width={4} height={8} fill="#e8c84a" opacity={0.6} />
      <rect x={x - 4} y={y - 3} width={8} height={4} fill="#e8c84a" opacity={0.6} />
      <rect x={x + 4} y={y - 1} width={4} height={2} fill="#e8c84a" opacity={0.6} />
    </>
  );
}

function ProjectorScreenSVG({ x, y }: { x: number; y: number }) {
  return (
    <>
      <rect x={x - 92} y={y - 22} width={184} height={5} fill="#272727" rx={2} />
      <rect x={x - 88} y={y - 17} width={176} height={34} fill="#b9bbb8" />
      <rect x={x - 84} y={y - 14} width={168} height={28} fill="#cfd1ce" />
      <rect x={x - 92} y={y + 17} width={184} height={5} fill="#333333" rx={2} />
    </>
  );
}

function SpeakerSVG({ x, y, color = '#2a2a2a' }: { x: number; y: number; color?: string }) {
  return (
    <g
      data-base-size="speaker-0.5"
      transform={`translate(${x},${y}) scale(0.5) translate(${-x},${-y})`}
    >
      <rect x={x - 24} y={y - 36} width={48} height={72} fill="#080808" />
      <rect x={x - 21} y={y - 33} width={42} height={66} fill={color} />
      <rect x={x - 6} y={y - 25} width={12} height={12} fill="#111111" />
      <rect x={x - 3} y={y - 22} width={6} height={6} fill="#5a5a5a" />
      <rect x={x - 15} y={y - 5} width={30} height={30} fill="#101010" data-speaker-driver="woofer" />
      <rect x={x - 11} y={y - 1} width={22} height={22} fill="#242424" />
      <rect x={x - 5} y={y + 5} width={10} height={10} fill="#080808" />
      <rect x={x - 18} y={y + 30} width={36} height={3} fill="#555555" opacity={0.45} />
    </g>
  );
}

function CoffeeTableSVG({ x, y }: { x: number; y: number }) {
  return (
    <>
      <rect
        x={x - 72}
        y={y - 22}
        width={144}
        height={56}
        fill="#00000030"
        rx={2}
      />
      <rect
        x={x - 76}
        y={y - 26}
        width={144}
        height={56}
        fill="#3d2e1a"
        rx={2}
      />
      <rect
        x={x - 72}
        y={y - 22}
        width={136}
        height={48}
        fill="#4a3820"
        rx={1}
      />
      <rect
        x={x - 70}
        y={y - 20}
        width={136}
        height={6}
        fill="#5a4830"
        opacity={0.5}
      />
      <rect x={x - 72} y={y + 24} width={10} height={6} fill="#2a1e0e" />
      <rect x={x + 62} y={y + 24} width={10} height={6} fill="#2a1e0e" />
      {/* Remote */}
      <rect x={x + 20} y={y - 12} width={32} height={14} fill="#1a1a1a" rx={2} />
      <rect x={x + 24} y={y - 9} width={10} height={4} fill="#333" rx={1} />
      <rect x={x + 38} y={y - 9} width={4} height={4} fill="#e8c84a" rx={1} opacity={0.7} />
      {/* Book */}
      <rect x={x - 60} y={y - 16} width={40} height={30} fill="#8b0000" rx={1} />
      <rect x={x - 56} y={y - 12} width={32} height={22} fill="#a01010" rx={1} />
      <rect x={x - 60} y={y - 16} width={5} height={30} fill="#600000" />
      {/* Cup */}
      <rect x={x - 8} y={y - 6} width={14} height={14} fill="#c8a060" rx={3} />
      <rect x={x - 6} y={y - 4} width={10} height={10} fill="#3a2010" rx={2} />
    </>
  );
}

interface Props {
  decoration: Decoration;
}

function DecorationSVG({ decoration }: Props) {
  const { type, x, y, rotation = 0, color } = decoration;
  const scale = decorationScale(decoration);
  const content = (() => {
    switch (type) {
      case 'plant':
        return (
          <PlantDecorationSVG
            x={x}
            y={y}
            variant={decoration.plantVariant}
          />
        );
      case 'plant-tall':
        return <PlantDecorationSVG x={x} y={y} variant="umbrella-tree" />;
      case 'fern':
        return <PlantDecorationSVG x={x} y={y} variant="maidenhair-fern" />;
      case 'lamp':
        return <LampSVG x={x} y={y} color={color} />;
      case 'floor-lamp':
        return <FloorLampSVG x={x} y={y} color={color} />;
      case 'table':
        return <SideTableSVG x={x} y={y} color={color} />;
      case 'rug':
        return <RugSVG x={x} y={y} color={decoration.color} />;
      case 'tv':
        return <TvSVG x={x} y={y} color={color} />;
      case 'projector-screen':
        return <ProjectorScreenSVG x={x} y={y} />;
      case 'speaker':
        return <SpeakerSVG x={x} y={y} color={color} />;
      case 'coffee-table':
        return <CoffeeTableSVG x={x} y={y} />;
      default:
        return null;
    }
  })();

  const scaledContent =
    scale === 1 ? (
      content
    ) : (
      <g transform={`translate(${x},${y}) scale(${scale}) translate(${-x},${-y})`}>
        {content}
      </g>
    );

  if (rotation === 0) return <>{scaledContent}</>;
  return (
    <g transform={`rotate(${rotation}, ${x}, ${y})`}>
      {scaledContent}
    </g>
  );
}

export default React.memo(DecorationSVG);
