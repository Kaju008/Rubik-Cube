import { useCallback, useEffect, useState } from 'react';
import { Home } from './screens/Home';
import { Scan } from './screens/Scan';
import { Review } from './screens/Review';
import { Solve } from './screens/Solve';
import { Done } from './screens/Done';
import { LearnHub, LessonPage } from './screens/Learn';
import { Tricks } from './screens/Tricks';
import { Speed } from './screens/Speed';
import { setSfxEnabled, sfx, unlockAudio } from './audio/sfx';
import { setVoiceEnabled, stopVoice } from './audio/voice';
import { applyMoves, randomScramble, solvedState, State } from './cube/model';
import { ColorName, STANDARD_NAMES } from './scan/color';
import type { Solution } from './cube/beginner';
import { Mascot, startEyeTracking } from './ui/Mascot';
import { nav, useRoute } from './router';

export interface CubeData { state: State; names: ColorName[]; scramble?: string[]; source: 'scan' | 'demo' | 'manual' }
export interface DoneStats { moves: number; ms: number; method: Solution['method'] }
type Screen = 'scan' | 'review' | 'solve' | 'done';

const load = (k: string, d: boolean) => { try { const v = localStorage.getItem(k); return v === null ? d : v === '1'; } catch { return d; } };
const save = (k: string, v: boolean) => { try { localStorage.setItem(k, v ? '1' : '0'); } catch { /* private mode */ } };

const NAV = [
  { id: 'solve', label: 'Solve', icon: '📷' },
  { id: 'learn', label: 'Learn', icon: '🎓' },
  { id: 'tricks', label: 'Tricks', icon: '✨' },
  { id: 'speed', label: 'Speed', icon: '⏱' },
];

export default function App() {
  const route = useRoute();
  const [screen, setScreen] = useState<Screen>('scan');
  const [cube, setCube] = useState<CubeData | null>(null);
  const [stats, setStats] = useState<DoneStats | null>(null);
  const [sound, setSound] = useState(() => load('cubr.sound', true));
  const [voice, setVoice] = useState(() => load('cubr.voice', true));

  useEffect(() => { setSfxEnabled(sound); save('cubr.sound', sound); }, [sound]);
  useEffect(() => { setVoiceEnabled(voice); save('cubr.voice', voice); }, [voice]);
  useEffect(() => { startEyeTracking(); }, []);
  useEffect(() => { stopVoice(); window.scrollTo(0, 0); }, [route.section, route.sub]);
  // the solve flow needs a fresh start if someone lands on #/solve directly
  useEffect(() => { if (route.section === 'solve' && !cube && screen !== 'scan') setScreen('scan'); }, [route.section, cube, screen]);

  const go = useCallback((s: Screen) => { stopVoice(); setScreen(s); window.scrollTo(0, 0); }, []);

  const startScan = () => { unlockAudio(); sfx.start(); setScreen('scan'); nav('/solve'); };
  const startDemo = () => {
    unlockAudio(); sfx.start();
    const scramble = randomScramble(20);
    setCube({ state: applyMoves(solvedState(), scramble), names: STANDARD_NAMES, scramble, source: 'demo' });
    setScreen('review');
    nav('/solve');
  };
  const startManual = () => { setCube({ state: solvedState(), names: STANDARD_NAMES, source: 'manual' }); go('review'); };

  const section = ['learn', 'tricks', 'speed', 'solve'].includes(route.section) ? route.section : 'home';

  return (
    <div className={`app screen-${section === 'solve' ? screen : section}`} onPointerDown={unlockAudio}>
      <div className="bg-blobs" aria-hidden="true"><i /><i /><i /></div>
      <header className="topbar">
        <button className="logo" onClick={() => nav('/')} aria-label="Cubr home">
          <Mascot size={44} id="logo" className="logo-mascot" />
          <span className="wordmark">cubr</span>
        </button>
        <nav className="topnav" aria-label="Sections">
          {NAV.map((n) => (
            <button key={n.id} className={section === n.id ? 'on' : ''} onClick={() => { sfx.tap(); if (n.id === 'solve') startScan(); else nav(`/${n.id}`); }}>{n.label}</button>
          ))}
        </nav>
        <div className="toggles">
          <button className={`chip ${sound ? 'on' : ''}`} onClick={() => { unlockAudio(); setSound(!sound); }} aria-pressed={sound} title="Sound effects">
            {sound ? '🔔' : '🔕'} <span>Sound</span>
          </button>
          <button className={`chip ${voice ? 'on' : ''}`} onClick={() => setVoice(!voice)} aria-pressed={voice} title="Voice guide">
            {voice ? '🗣️' : '🤐'} <span>Voice</span>
          </button>
        </div>
      </header>
      <main>
        {section === 'home' && <Home onStart={startScan} onDemo={startDemo} />}
        {section === 'learn' && (route.sub ? <LessonPage id={route.sub} /> : <LearnHub />)}
        {section === 'tricks' && <Tricks tab={route.sub} />}
        {section === 'speed' && <Speed tab={route.sub} />}
        {section === 'solve' && screen === 'scan' && (
          <Scan onDone={(state, names) => { setCube({ state, names, source: 'scan' }); go('review'); }} onDemo={startDemo} onManual={startManual} />
        )}
        {section === 'solve' && screen === 'review' && cube && <Review cube={cube} onChange={setCube} onSolve={() => go('solve')} onRescan={() => go('scan')} />}
        {section === 'solve' && screen === 'solve' && cube && <Solve cube={cube} onDone={(s) => { setStats(s); go('done'); }} onBack={() => go('review')} />}
        {section === 'solve' && screen === 'done' && <Done stats={stats} onAgain={startScan} onHome={() => nav('/')} onDemo={startDemo} />}
      </main>
      <nav className="bottomnav" aria-label="Sections">
        <button className={section === 'home' ? 'on' : ''} onClick={() => nav('/')}><span aria-hidden="true">🏠</span>Home</button>
        {NAV.map((n) => (
          <button key={n.id} className={section === n.id ? 'on' : ''} onClick={() => { sfx.tap(); if (n.id === 'solve') startScan(); else nav(`/${n.id}`); }}>
            <span aria-hidden="true">{n.icon}</span>{n.label}
          </button>
        ))}
      </nav>
    </div>
  );
}
