import { useCallback, useEffect, useRef, useState } from 'react';

export type CamStatus = 'idle' | 'starting' | 'live' | 'denied' | 'unavailable';

export function useCamera() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [status, setStatus] = useState<CamStatus>('idle');
  const [facing, setFacing] = useState<'user' | 'environment'>('user');
  const [canSwitch, setCanSwitch] = useState(false);

  const stop = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }, []);

  const start = useCallback(async (mode: 'user' | 'environment' = facing) => {
    if (!navigator.mediaDevices?.getUserMedia) { setStatus('unavailable'); return; }
    setStatus('starting');
    stop();
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: { facingMode: { ideal: mode }, width: { ideal: 1280 }, height: { ideal: 720 } },
      });
      streamRef.current = stream;
      const v = videoRef.current;
      if (v) {
        v.srcObject = stream;
        v.muted = true;
        v.setAttribute('playsinline', 'true');
        await v.play().catch(() => {});
      }
      setFacing(mode);
      setStatus('live');
      try {
        const devs = await navigator.mediaDevices.enumerateDevices();
        setCanSwitch(devs.filter((d) => d.kind === 'videoinput').length > 1);
      } catch { /* ignore */ }
    } catch (e) {
      const name = (e as DOMException)?.name;
      setStatus(name === 'NotAllowedError' || name === 'SecurityError' ? 'denied' : 'unavailable');
    }
  }, [facing, stop]);

  const flip = useCallback(() => start(facing === 'user' ? 'environment' : 'user'), [facing, start]);

  useEffect(() => stop, [stop]);

  // attach the stream if the <video> element mounts after the camera started
  useEffect(() => {
    const v = videoRef.current, st = streamRef.current;
    if (v && st && v.srcObject !== st) {
      v.srcObject = st;
      v.muted = true;
      v.play().catch(() => {});
    }
  });

  // the selfie camera is shown mirrored, like a mirror; the rear camera is not
  const mirrored = facing === 'user';
  return { videoRef, status, start, stop, flip, facing, mirrored, canSwitch, stream: streamRef };
}
