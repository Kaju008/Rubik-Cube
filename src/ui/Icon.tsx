// Cubr icon set — custom line icons on a 24px grid, 1.75 stroke, rounded joins. Colour = currentColor.
import type { CSSProperties } from 'react';

type Draw = (string | { c: [number, number, number]; fill?: boolean } | { r: [number, number, number, number, number]; fill?: boolean })[];

const I: Record<string, Draw> = {
  sound: ['M4 9.5h3.2L12 5.5v13l-4.8-4H4z', 'M15.5 9a4.2 4.2 0 0 1 0 6', 'M18.2 6.5a8 8 0 0 1 0 11'],
  'sound-off': ['M4 9.5h3.2L12 5.5v13l-4.8-4H4z', 'M16 9.5l5 5', 'M21 9.5l-5 5'],
  voice: ['M5 5.5h14a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-7.5L7 21v-3.5H5a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2z', 'M8 11v1.5', 'M10.7 9.3v4.9', 'M13.3 10v3.5', 'M16 11v1.5'],
  'voice-off': ['M5 5.5h14a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-7.5L7 21v-3.5H5a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2z', 'M4 3.5l16.5 17'],
  music: ['M9 17.5V6.2l11-2.7v11', { c: [6.5, 17.5, 2.5] }, { c: [17.5, 14.5, 2.5] }],
  'music-off': ['M9 17.5V6.2l11-2.7v11', { c: [6.5, 17.5, 2.5] }, { c: [17.5, 14.5, 2.5] }, 'M3.5 3.5l17 17'],
  camera: ['M3.5 8.5a2 2 0 0 1 2-2h2.2l1.6-2h5.4l1.6 2h2.2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-13a2 2 0 0 1-2-2z', { c: [12, 13, 3.5] }],
  scan: ['M4 8V5.5A1.5 1.5 0 0 1 5.5 4H8', 'M16 4h2.5A1.5 1.5 0 0 1 20 5.5V8', 'M20 16v2.5a1.5 1.5 0 0 1-1.5 1.5H16', 'M8 20H5.5A1.5 1.5 0 0 1 4 18.5V16', 'M3.5 12h17'],
  cube: ['M12 3l8 4.5v9L12 21l-8-4.5v-9z', 'M4 7.5l8 4.5 8-4.5', 'M12 12v9'],
  learn: ['M2.5 9L12 4.5 21.5 9 12 13.5z', 'M6.5 11v4.5c0 1.5 2.5 3 5.5 3s5.5-1.5 5.5-3V11', 'M21.5 9v5'],
  sparkle: ['M11 3.5l1.9 5.1 5.1 1.9-5.1 1.9L11 17.5l-1.9-5.1L4 10.5l5.1-1.9z', 'M18.5 15l.8 2.2 2.2.8-2.2.8-.8 2.2-.8-2.2-2.2-.8 2.2-.8z'],
  timer: [{ c: [12, 13.5, 7.5] }, 'M12 13.5V9.5', 'M9.5 2.8h5', 'M18.2 6.6l1.6-1.6'],
  home: ['M4 10.5L12 4l8 6.5V19a1 1 0 0 1-1 1h-4.5v-5.5h-5V20H5a1 1 0 0 1-1-1z'],
  play: [{ r: [0, 0, 0, 0, 0] }, 'M7.5 5.2v13.6a.6.6 0 0 0 .9.5l10.8-6.8a.6.6 0 0 0 0-1L8.4 4.7a.6.6 0 0 0-.9.5z'],
  pause: [{ r: [6.5, 5, 3.5, 14, 1], fill: true }, { r: [14, 5, 3.5, 14, 1], fill: true }],
  prev: ['M18 6.5v11a.5.5 0 0 1-.8.4L9.5 12.4a.5.5 0 0 1 0-.8l7.7-5.5a.5.5 0 0 1 .8.4z', 'M6 6v12'],
  next: ['M6 6.5v11a.5.5 0 0 0 .8.4l7.7-5.5a.5.5 0 0 0 0-.8L6.8 6.1a.5.5 0 0 0-.8.4z', 'M18 6v12'],
  restart: ['M4.5 12a7.5 7.5 0 1 0 2.2-5.3', 'M4.5 4.5v4h4'],
  undo: ['M9 14L4 9l5-5', 'M4 9h10.5a5.5 5.5 0 0 1 0 11H11'],
  lifebuoy: [{ c: [12, 12, 8.5] }, { c: [12, 12, 3.5] }, 'M6 6l3.5 3.5', 'M14.5 14.5L18 18', 'M18 6l-3.5 3.5', 'M9.5 14.5L6 18'],
  check: ['M5 12.5l4.5 4.5L19 7.5'],
  close: ['M6.5 6.5l11 11', 'M17.5 6.5l-11 11'],
  'arrow-right': ['M5 12h14', 'M13 6l6 6-6 6'],
  'arrow-left': ['M19 12H5', 'M11 6l-6 6 6 6'],
  'chevron-right': ['M9.5 6l6 6-6 6'],
  refresh: ['M20 12a8 8 0 1 1-2.3-5.6', 'M20 4.5v4h-4'],
  minimize: ['M5 15.5h14'],
  expand: ['M9 4H4v5', 'M15 4h5v5', 'M20 15v5h-5', 'M4 15v5h5'],
  grip: [{ c: [9, 7, 1], fill: true }, { c: [15, 7, 1], fill: true }, { c: [9, 12, 1], fill: true }, { c: [15, 12, 1], fill: true }, { c: [9, 17, 1], fill: true }, { c: [15, 17, 1], fill: true }],
  bulb: ['M9.5 18h5', 'M10.5 21h3', 'M12 3a6 6 0 0 0-3.5 10.9c.6.5 1 1.2 1 2V16h5v-.1c0-.8.4-1.5 1-2A6 6 0 0 0 12 3z'],
  target: [{ c: [12, 12, 8.5] }, { c: [12, 12, 4.8] }, { c: [12, 12, 1.2], fill: true }],
  trophy: ['M7.5 4h9v4.5a4.5 4.5 0 0 1-9 0z', 'M7.5 6H4.5v1a3 3 0 0 0 3 3', 'M16.5 6h3v1a3 3 0 0 1-3 3', 'M12 13v4', 'M8.5 20.5h7', 'M9.5 17h5v3.5h-5z'],
  flame: ['M12 3c.5 3 4.5 5 4.5 9.5a4.5 4.5 0 0 1-9 0c0-2 1-3.2 2-4 0 1.5.8 2.5 1.8 2.8C11 8.5 11.5 5.5 12 3z'],
  lock: [{ r: [5, 10.5, 14, 10, 2] }, 'M8 10.5V8a4 4 0 0 1 8 0v2.5'],
  download: ['M12 4v11', 'M7 10.5l5 5 5-5', 'M5 20h14'],
  share: ['M12 15V4', 'M8 8l4-4 4 4', 'M5 12.5V19a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-6.5'],
  hand: ['M8 13V6.5a1.5 1.5 0 0 1 3 0V12', 'M11 11V5a1.5 1.5 0 0 1 3 0v6', 'M14 11V6.5a1.5 1.5 0 0 1 3 0V14a6 6 0 0 1-6 6h-.5a5.5 5.5 0 0 1-4.6-2.5L4 14.4a1.5 1.5 0 0 1 2.4-1.8L8 14.5'],
  book: ['M12 6.5C10.5 5 8 4.5 4 4.5v13c4 0 6.5.5 8 2 1.5-1.5 4-2 8-2v-13c-4 0-6.5.5-8 2z', 'M12 6.5v13'],
  cards: [{ r: [3, 7, 13, 13, 2] }, 'M7 3.5h12a2 2 0 0 1 2 2V17'],
  bolt: ['M13 3L5 13.5h6L10 21l8-10.5h-6z'],
  eye: ['M2.5 12s3.5-6.5 9.5-6.5S21.5 12 21.5 12s-3.5 6.5-9.5 6.5S2.5 12 2.5 12z', { c: [12, 12, 2.8] }],
  info: [{ c: [12, 12, 8.5] }, 'M12 11v5.5', 'M12 7.8v.1'],
  search: [{ c: [10.5, 10.5, 6.5] }, 'M15.5 15.5L20 20'],
  pip: [{ r: [3, 5, 18, 14, 2] }, { r: [12, 11, 6.5, 5.5, 1], fill: true }],
  letters: ['M3.5 18L8 6h1l4.5 12', 'M5.2 14h6.6', 'M15.5 9.5h4.5l-4.5 8.5h4.5'],
  plus: ['M9.5 4h5v5.5H20v5h-5.5V20h-5v-5.5H4v-5h5.5z'],
  corner: ['M5 19V9a4 4 0 0 1 4-4h10', { r: [12, 12, 7, 7, 1.5] }],
  layers: ['M12 4l8.5 4.5L12 13 3.5 8.5z', 'M3.5 12.5L12 17l8.5-4.5', 'M3.5 16.5L12 21l8.5-4.5'],
  swap: ['M7 7h12', 'M15 3l4 4-4 4', 'M17 17H5', 'M9 13l-4 4 4 4'],
  cycle: ['M19.5 11a7.5 7.5 0 0 0-13.6-4.3', 'M4.5 13a7.5 7.5 0 0 0 13.6 4.3', 'M5.5 3v3.7h3.7', 'M18.5 21v-3.7h-3.7'],
  twist: ['M12 12a2 2 0 1 1 2-2 4 4 0 1 1-4-4 6 6 0 1 1-6 6'],
  grid: [{ r: [4, 4, 16, 16, 2.5] }, 'M9.3 4v16', 'M14.7 4v16', 'M4 9.3h16', 'M4 14.7h16'],
  puzzle: ['M4 8h3.5a2 2 0 1 1 4 0H15v3.5a2 2 0 1 1 0 4V19H4z', 'M15 8h5v11h-5'],
  flag: ['M5 21V4', 'M5 4.5h11.5l-2.2 4 2.2 4H5'],
  rocket: ['M12.5 15.5L8.5 11.5C10 6.5 13.5 3.5 20.5 3.5c0 7-3 10.5-8 12z', 'M8.5 11.5L5 12l-1.5 2.8 4 .7', 'M12.5 15.5L12 19l-2.8 1.5-.7-4', { c: [15, 9, 1.6] }],
  party: ['M4 20l4.5-12 7.5 7.5z', 'M13 4.5c.5 1 .4 2-.3 2.8', 'M19.5 11c-1-.5-2-.4-2.8.3', 'M16.5 3.5v1.5', 'M20.5 7.5H19', 'M15 8.5l2-2'],
  star: ['M12 3.8l2.5 5.2 5.7.8-4.1 4 1 5.6-5.1-2.7-5.1 2.7 1-5.6-4.1-4 5.7-.8z'],
  wand: ['M4 20L15 9', 'M13 7l4 4', 'M17.5 3v2.5', 'M21 6.5h-2.5', 'M20 3l-1.5 1.5'],
  keyboard: [{ r: [2.5, 6, 19, 12, 2] }, 'M6 10h.01M9.3 10h.01M12.6 10h.01M15.9 10h.01M18 10h.01M7 14h10'],
  sliders: ['M4 7h10', 'M18 7h2', { c: [16, 7, 2] }, 'M4 17h3', 'M11 17h9', { c: [9, 17, 2] }],
};

export type IconName = keyof typeof I;

export function Icon({ name, size = 20, className, style, title }: { name: IconName | string; size?: number; className?: string; style?: CSSProperties; title?: string }) {
  const parts = I[name] ?? I.info;
  return (
    <svg
      className={`icon ${className ?? ''}`}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      style={style}
      aria-hidden={title ? undefined : true}
      role={title ? 'img' : undefined}
    >
      {title && <title>{title}</title>}
      {parts.map((p, k) => {
        if (typeof p === 'string') return <path key={k} d={p} fill={name === 'play' ? 'currentColor' : undefined} />;
        if ('c' in p) return <circle key={k} cx={p.c[0]} cy={p.c[1]} r={p.c[2]} fill={p.fill ? 'currentColor' : 'none'} stroke={p.fill ? 'none' : undefined} />;
        if (p.r[2] === 0) return null;
        return <rect key={k} x={p.r[0]} y={p.r[1]} width={p.r[2]} height={p.r[3]} rx={p.r[4]} fill={p.fill ? 'currentColor' : 'none'} stroke={p.fill ? 'none' : undefined} />;
      })}
    </svg>
  );
}
