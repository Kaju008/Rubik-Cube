// Flat cube map; tap any sticker to fix its colour.
import { useState } from 'react';
import type { State } from '../cube/model';

interface Props { state: State; colors: string[]; names: string[]; bad?: number[]; onChange?: (idx: number, color: number) => void }

// face index in Kociemba order -> grid cell (col,row) in a 4×3 cross layout
const LAYOUT: [number, number, number][] = [
  [0, 1, 0], // U
  [1, 2, 1], // R
  [2, 1, 1], // F
  [3, 1, 2], // D
  [4, 0, 1], // L
  [5, 3, 1], // B
];

export function Net({ state, colors, names, bad = [], onChange }: Props) {
  const [open, setOpen] = useState<number | null>(null);
  return (
    <div className="net" onClick={() => setOpen(null)}>
      {LAYOUT.map(([face, col, row]) => (
        <div key={face} className="net-face" style={{ gridColumn: col + 1, gridRow: row + 1 }}>
          {Array.from({ length: 9 }, (_, k) => {
            const idx = face * 9 + k;
            const centre = k === 4;
            return (
              <button
                key={k}
                className={`net-sticker ${bad.includes(idx) ? 'bad' : ''} ${open === idx ? 'open' : ''}`}
                style={{ background: colors[state[idx]] }}
                disabled={centre || !onChange}
                aria-label={`${names[state[idx]]} sticker${centre ? ' (centre)' : ''}`}
                onClick={(e) => { e.stopPropagation(); setOpen(open === idx ? null : idx); }}
              >
                {open === idx && (
                  <span className="palette" onClick={(e) => e.stopPropagation()}>
                    {colors.map((c, ci) => (
                      <span
                        key={ci}
                        role="button"
                        tabIndex={0}
                        className="swatch"
                        style={{ background: c }}
                        aria-label={names[ci]}
                        onClick={() => { onChange?.(idx, ci); setOpen(null); }}
                      />
                    ))}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      ))}
    </div>
  );
}
