import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';
import { CubeView } from '../three/CubeView';
import type { State } from '../cube/model';

export interface CubeCanvasHandle { view: CubeView | null }
interface Props {
  state: State;
  colors: string[];
  sync?: boolean;          // keep the 3D cube in sync with the `state` prop
  autoSpin?: boolean;
  peek?: boolean;
  interactive?: boolean;
  onTap?: () => void;
  className?: string;
  mirrored?: boolean;
  label?: string;
}

export const CubeCanvas = forwardRef<CubeCanvasHandle, Props>(function CubeCanvas(
  { state, colors, sync, autoSpin, peek, interactive, onTap, className, mirrored, label }, ref,
) {
  const el = useRef<HTMLDivElement>(null);
  const view = useRef<CubeView | null>(null);
  const tapRef = useRef(onTap);
  tapRef.current = onTap;

  useEffect(() => {
    let v: CubeView | null = null;
    try {
      v = new CubeView(el.current!, state, colors, { autoSpin, peek, interactive, onTap: () => tapRef.current?.() });
    } catch (e) {
      console.warn('3D unavailable', e);
    }
    view.current = v;
    return () => { v?.dispose(); view.current = null; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => { if (sync) view.current?.setState(state, colors); }, [sync, state, colors]);
  useEffect(() => { view.current?.setSpin(!!autoSpin); }, [autoSpin]);

  useImperativeHandle(ref, () => ({ get view() { return view.current; } }), []);
  return <div ref={el} className={`cube-canvas ${className ?? ''}`} style={mirrored ? { transform: 'scaleX(-1)' } : undefined} role="img" aria-label={label ?? '3D cube'} />;
});
