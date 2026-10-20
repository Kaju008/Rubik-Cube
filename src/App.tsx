import { useCallback, useEffect, useState } from 'react';
import { Home } from './screens/Home';
import { Scan } from './screens/Scan';
import { Review } from './screens/Review';
import { Solve } from './screens/Solve';
import { Done } from './screens/Done';
import { setSfxEnabled, sfx, unlockAudio } from './audio/sfx';
import { setVoiceEnabled, stopVoice } from './audio/voice';
import { applyMoves, randomScramble, solvedState, State } from './cube/model';
import { ColorName, STANDARD_NAMES } from './scan/color';
import type { Solution } from './cube/beginner';

export interface CubeData { state: State; names: ColorName[]; scramble?: string[]; source: 'scan' | 'demo' | 'manual' }
export interface DoneStats { moves: number; ms: number; method: Solution['method'] }
type Screen = 'home' | 'scan' | 'review' | 'solve' | 'done';


const load = (k: string, d: boolean) => { try { const v = localStorage.getItem(k); return v === null ? d : v === '1'; } catch { return d; } };
const save = (k: string, v: boolean) => { try { localStorage.setItem(k, v ? '1' : '0'); } catch { /* private mode */ } };

export default function App() {
  const [screen, setScreen] = useState<Screen>('home');
  const [cube, setCube] = useState<CubeData | null>(null);
  const [stats, setStats] = useState<DoneStats | null>(null);
  const [sound, setSound] = useState(() => load('cubr.sound', true));
  const [voice, setVoice] = useState(() => load('cubr.voice', true));

  useEffect(() => { setSfxEnabled(sound); save('cubr.sound', sound); }, [sound]);
  useEffect(() => { setVoiceEnabled(voice); save('cubr.voice', voice); }, [voice]);
  useEffect(() => { window.scrollTo(0, 0); }, [screen]);

  const go = useCallback((s: Screen) => { stopVoice(); setScreen(s); }, []);

  const startScan = () => { unlockAudio(); sfx.start(); go('scan'); };
  const startDemo = () => {
    unlockAudio(); sfx.start();
    const scramble = randomScramble(20);
    setCube({ state: applyMoves(solvedState(), scramble), names: STANDARD_NAMES, scramble, source: 'demo' });
    go('review');
  };
  const startManual = () => {
    setCube({ state: solvedState(), names: STANDARD_NAMES, source: 'manual' });
    go('review');
  };

  const toggles = (
    <div className="toggles">
      <button className={`chip ${sound ? 'on' : ''}`} onClick={() => { unlockAudio(); setSound(!sound); }} aria-pressed={sound} title="Sound effects">
        {sound ? '🔔' : '🔕'} <span>Sound</span>
      </button>
      <button className={`chip ${voice ? 'on' : ''}`} onClick={() => setVoice(!voice)} aria-pressed={voice} title="Voice guide">
        {voice ? '🗣️' : '🤐'} <span>Voice</span>
      </button>
    </div>
  );

  return (
    <div className={`app screen-${screen}`}>
      <div className="bg-blobs" aria-hidden="true"><i /><i /><i /></div>
      <header className="topbar">
        <button className="logo" onClick={() => go('home')} aria-label="Cubr home">
          <span className="logo-mark" aria-hidden="true"><i /><i /><i /><i /></span>
          cubr
        </button>
        {toggles}
      </header>
      <main>
        {screen === 'home' && <Home onStart={startScan} onDemo={startDemo} />}
        {screen === 'scan' && (
          <Scan
            onDone={(state, names) => { setCube({ state, names, source: 'scan' }); go('review'); }}
            onDemo={startDemo}
            onManual={startManual}
          />
        )}
        {screen === 'review' && cube && (
          <Review cube={cube} onChange={setCube} onSolve={() => go('solve')} onRescan={() => go('scan')} />
        )}
        {screen === 'solve' && cube && (
          <Solve cube={cube} onDone={(s) => { setStats(s); go('done'); }} onBack={() => go('review')} />
        )}
        {screen === 'done' && <Done stats={stats} onAgain={startScan} onHome={() => go('home')} onDemo={startDemo} />}
      </main>
    </div>
  );
}
