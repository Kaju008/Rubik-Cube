// Floating camera window: drag it anywhere, minimise it to a pill, or expand it to check one side of the cube.
import { forwardRef, useEffect, useRef, useState, type ReactNode, type RefObject } from 'react';
import { Icon } from './Icon';

export type CamMode = 'mini' | 'float' | 'check';

interface Props {
  videoRef: RefObject<HTMLVideoElement>;
  live: boolean;
  mode: CamMode;
  onMode: (m: CamMode) => void;
  onClose: () => void;
  overlay?: ReactNode;      // grid + hints in check mode
  label?: string;
}

export const FloatCam = forwardRef<HTMLDivElement, Props>(function FloatCam({ videoRef, live, mode, onMode, onClose, overlay, label = 'Camera' }, boxRef) {
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
  const drag = useRef<{ dx: number; dy: number } | null>(null);
  const el = useRef<HTMLDivElement | null>(null);

  useEffect(() => { if (mode === 'check') setPos(null); }, [mode]);

  const onDown = (e: React.PointerEvent) => {
    if (mode !== 'float' || !el.current) return;
    const r = el.current.getBoundingClientRect();
    drag.current = { dx: e.clientX - r.left, dy: e.clientY - r.top };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };
  const onMove = (e: React.PointerEvent) => {
    if (!drag.current || !el.current) return;
    const w = el.current.offsetWidth, h = el.current.offsetHeight;
    setPos({ x: Math.max(8, Math.min(innerWidth - w - 8, e.clientX - drag.current.dx)), y: Math.max(64, Math.min(innerHeight - h - 8, e.clientY - drag.current.dy)) });
  };
  const onUp = () => { drag.current = null; };

  if (mode === 'mini') {
    return (
      <button className="cam-pill" onClick={() => onMode('float')} aria-label="Show camera">
        <span className={`rec ${live ? 'on' : ''}`} /><Icon name="camera" size={18} /><span>{label}</span>
      </button>
    );
  }
  return (
    <div
      ref={(n) => { el.current = n; if (typeof boxRef === 'function') boxRef(n); else if (boxRef) boxRef.current = n; }}
      className={`float-cam ${mode}`}
      style={pos && mode === 'float' ? { left: pos.x, top: pos.y, right: 'auto', bottom: 'auto' } : undefined}
    >
      <div className="fc-bar" onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp}>
        {mode === 'float' && <Icon name="grip" size={16} className="fc-grip" />}
        <span className={`rec ${live ? 'on' : ''}`} />
        <span className="fc-title">{mode === 'check' ? 'Check one side' : label}</span>
        <span className="fc-actions">
          {mode === 'float' && <button onClick={() => onMode('mini')} aria-label="Minimise camera" title="Minimise"><Icon name="minimize" size={16} /></button>}
          <button onClick={onClose} aria-label={mode === 'check' ? 'Close check' : 'Turn camera off'} title="Close"><Icon name="close" size={16} /></button>
        </span>
      </div>
      <div className="fc-video">
        <video ref={videoRef} className="mirror" autoPlay playsInline muted />
        {!live && <div className="fc-wait"><Icon name="camera" size={22} /><span>Starting camera…</span></div>}
        {overlay}
      </div>
    </div>
  );
});
