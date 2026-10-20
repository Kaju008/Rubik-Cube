// Victory selfie: 3-2-1 countdown, snap, then a shareable card with the solve time + Cubr logo.
import { useEffect, useRef, useState } from 'react';
import { useCamera } from '../hooks/useCamera';
import { sfx } from '../audio/sfx';
import { speak } from '../audio/voice';

interface Props { time: string; moves: number; route: string; onClose: () => void }

function mascotDataUrl(): string | null {
  const svg = document.querySelector('.logo .mascot') as SVGElement | null;
  if (!svg) return null;
  const clone = svg.cloneNode(true) as SVGElement;
  clone.setAttribute('width', '240'); clone.setAttribute('height', '240');
  return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(new XMLSerializer().serializeToString(clone));
}
const loadImg = (src: string) => new Promise<HTMLImageElement>((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = src; });

async function compose(video: HTMLVideoElement, time: string, moves: number, route: string): Promise<string> {
  const W = 1080, H = 1350;
  const c = document.createElement('canvas');
  c.width = W; c.height = H;
  const g = c.getContext('2d')!;
  // cover-crop the frame into 4:5, mirrored like the preview
  const vw = video.videoWidth || 1280, vh = video.videoHeight || 720;
  const s = Math.max(W / vw, H / vh);
  g.save(); g.translate(W, 0); g.scale(-1, 1);
  g.drawImage(video, (W - vw * s) / 2, (H - vh * s) / 2, vw * s, vh * s);
  g.restore();
  // fades
  let gr = g.createLinearGradient(0, H * 0.5, 0, H);
  gr.addColorStop(0, 'rgba(11,11,18,0)'); gr.addColorStop(1, 'rgba(11,11,18,0.92)');
  g.fillStyle = gr; g.fillRect(0, H * 0.5, W, H * 0.5);
  gr = g.createLinearGradient(0, 0, 0, 260);
  gr.addColorStop(0, 'rgba(11,11,18,0.75)'); gr.addColorStop(1, 'rgba(11,11,18,0)');
  g.fillStyle = gr; g.fillRect(0, 0, W, 260);
  try { await Promise.all([document.fonts.load('900 160px Unbounded'), document.fonts.load('700 40px "DM Sans"')]); } catch { /* fonts optional */ }
  // logo
  const m = mascotDataUrl();
  if (m) { try { g.drawImage(await loadImg(m), 44, 30, 150, 150); } catch { /* ignore */ } }
  g.fillStyle = '#F5F2EA'; g.font = '900 76px Unbounded, system-ui'; g.textBaseline = 'middle';
  g.fillText('cubr', 200, 104);
  // stats
  g.textBaseline = 'alphabetic';
  g.fillStyle = '#FF4FD8'; g.font = '700 40px "DM Sans", system-ui';
  g.fillText('SOLVED IN', 64, H - 300);
  const tg = g.createLinearGradient(64, 0, 760, 0);
  tg.addColorStop(0, '#FFD93B'); tg.addColorStop(0.5, '#FF8A1F'); tg.addColorStop(1, '#FF4FD8');
  g.fillStyle = tg; g.font = '900 200px Unbounded, system-ui';
  g.fillText(time, 56, H - 110);
  g.fillStyle = '#F5F2EA'; g.font = '700 46px "DM Sans", system-ui';
  g.fillText(`${moves} moves · ${route} route`, 64, H - 46);
  // confetti sprinkles
  const cols = ['#FFD93B', '#FF3B4E', '#FF8A1F', '#22D17A', '#2F7BFF', '#FF4FD8'];
  for (let k = 0; k < 26; k++) {
    g.save(); g.translate(Math.random() * W, Math.random() * 200 + (k % 2 ? 0 : H - 520));
    g.rotate(Math.random() * 6); g.fillStyle = cols[k % cols.length]; g.globalAlpha = 0.85;
    g.fillRect(-9, -9, 18, 18); g.restore();
  }
  return c.toDataURL('image/png');
}

export function SelfieBooth({ time, moves, route, onClose }: Props) {
  const cam = useCamera();
  const [count, setCount] = useState<number | null>(null);
  const [photo, setPhoto] = useState<string | null>(null);
  const [flash, setFlash] = useState(false);
  const timers = useRef<number[]>([]);

  const shoot = () => {
    setPhoto(null);
    speak('selfie_pose');
    [3, 2, 1].forEach((n, k) => timers.current.push(window.setTimeout(() => { setCount(n); sfx.tap(); }, 1400 + k * 1000)));
    timers.current.push(window.setTimeout(async () => {
      setCount(null); setFlash(true); sfx.capture();
      setTimeout(() => setFlash(false), 300);
      const v = cam.videoRef.current;
      if (v) { setPhoto(await compose(v, time, moves, route)); speak('selfie_done'); }
    }, 4400));
  };

  useEffect(() => {
    cam.start('user');
    return () => timers.current.forEach(clearTimeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => { if (cam.status === 'live' && !photo && count === null && timers.current.length === 0) shoot(); /* auto-start */
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cam.status]);

  const share = async () => {
    if (!photo) return;
    try {
      const blob = await (await fetch(photo)).blob();
      const file = new File([blob], 'cubr-solve.png', { type: 'image/png' });
      if (navigator.canShare?.({ files: [file] })) await navigator.share({ files: [file], text: `Solved my Rubik's Cube in ${time} with Cubr! 🧊` });
    } catch { /* cancelled */ }
  };

  return (
    <div className="booth" role="dialog" aria-label="Victory selfie">
      {!photo && <video ref={cam.videoRef} className="mirror" autoPlay playsInline muted />}
      {photo && <img src={photo} alt={`Selfie with solve time ${time}`} className="booth-photo" />}
      {!photo && <div className="booth-frame"><span className="booth-time">{time}</span><span className="booth-sub">{moves} moves</span></div>}
      {count !== null && <div className="countdown" key={count}>{count}</div>}
      {flash && <div className="flash" />}
      {cam.status === 'denied' && <p className="booth-msg">Camera is blocked, so no selfie this time.</p>}
      <div className="booth-actions">
        {photo ? (
          <>
            <a className="btn-toy" href={photo} download={`cubr-solve-${time.replace(':', 'm')}s.png`}>⬇ Download</a>
            {'share' in navigator && <button className="btn-ghost solid" onClick={share}>Share</button>}
            <button className="btn-ghost solid" onClick={shoot}>Retake</button>
          </>
        ) : (
          <button className="btn-ghost solid" onClick={shoot} disabled={count !== null || cam.status !== 'live'}>📸 Snap again</button>
        )}
        <button className="btn-ghost solid" onClick={() => { cam.stop(); onClose(); }}>Close</button>
      </div>
    </div>
  );
}
