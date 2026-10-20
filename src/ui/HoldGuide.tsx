// Floating side tab that shows, in 3D, how the cube should be held right now.
import { forwardRef, useState } from 'react';
import { CubeCanvas, CubeCanvasHandle } from './CubeCanvas';
import type { State } from '../cube/model';
import { ColorName, PALETTE, colorsFor, STANDARD_NAMES } from '../scan/color';

interface Props {
  state: State;
  facing: ColorName;      // colour pointing at the camera / at you
  top: ColorName;
  topLabel?: string;
  bottom?: ColorName;
  mirrored?: boolean;
  title?: string;
  className?: string;
  defaultOpen?: boolean;
}

const Pill = ({ k, c }: { k: string; c: ColorName }) => (
  <span className="hold-pill"><i style={{ background: PALETTE[c] }} />{k}<b>{c}</b></span>
);

export const HoldGuide = forwardRef<CubeCanvasHandle, Props>(function HoldGuide(
  { state, facing, top, topLabel = 'Top', bottom, mirrored, title = 'How to hold', className, defaultOpen = true }, ref,
) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <aside className={`hold-guide ${open ? '' : 'closed'} ${className ?? ''}`}>
      <button className="hold-tab" onClick={() => setOpen(!open)} aria-expanded={open}>
        <span>🧊 {title}</span><span aria-hidden="true">{open ? '–' : '+'}</span>
      </button>
      <div className="hold-body">
        <CubeCanvas ref={ref} state={state} colors={colorsFor(STANDARD_NAMES)} interactive={false} mirrored={mirrored} className="hold-cube" label={title} />
        <div className="hold-legend">
          <Pill k={topLabel} c={top} />
          <Pill k="Front" c={facing} />
          {bottom && <Pill k="Bottom" c={bottom} />}
        </div>
      </div>
    </aside>
  );
});
