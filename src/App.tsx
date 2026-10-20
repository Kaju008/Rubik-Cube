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
import { setMusicEnabled, startMusic } from './audio/music';
import { validate } from './cube/pieces';
import { Icon } from './ui/Icon';
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
  { id: 'solve', label: 'Solve', icon: 'scan' },
  { id: 'learn', label: 'Learn', icon: 'learn' },
  { id: 'tricks', label: 'Tricks', icon: 'sparkle' },
  { id: 'speed', label: 'Speed', icon: 'timer' },
];

export default function App() {
  const route = useRoute();
  const [screen, setScreen] = useState<Screen>('scan');
  const [cube, setCube] = useState<CubeData | null>(null);
  const [stats, setStats] = useState<DoneStats | null>(null);
  const [sound, setSound] = useState(() => load('cubr.sound', true));
  const [voice, setVoice] = useState(() => load('cubr.voice', true));
  const [music, setMusic] = useState(() => load('cubr.music', true));
  const [resume, setResume] = useState<Solution['method'] | undefined>(undefined);

  useEffect(() => { setSfxEnabled(sound); save('cubr.sound', sound); }, [sound]);
  useEffect(() => { setVoiceEnabled(voice); save('cubr.voice', voice); }, [voice]);
  useEffect(() => { startEyeTracking(); }, []);
  useEffect(() => { setMusicEnabled(music); save('cubr.music', music); }, [music]);
  // music starts once the browser allows audio (first tap)
  useEffect(() => { const on = () => { if (music) startMusic(); }; addEventListener('cubr-audio-ready', on); return () => removeEventListener('cubr-audio-ready', on); }, [music]);
  useEffect(() => { stopVoice(); window.scrollTo(0, 0); }, [route.section, route.sub]);
  // the solve flow needs a fresh start if someone lands on #/solve directly
  useEffect(() => { if (route.section === 'solve' && !cube && screen !== 'scan') setScreen('scan'); }, [route.section, cube, screen]);

  const go = useCallback((s: Screen) => { stopVoice(); setScreen(s); window.scrollTo(0, 0); }, []);

  const startScan = () => { unlockAudio(); sfx.start(); setResume(undefined); setScreen('scan'); nav('/solve'); };
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
            <button key={n.id} className={section === n.id ? 'on' : ''} onClick={() => { sfx.tap(); if (n.id === 'solve') startScan(); else nav(`/${n.id}`); }}><Icon name={n.icon} size={17} />{n.label}</button>
          ))}
        </nav>
        <div className="toggles" role="group" aria-label="Audio">
          <button className={`icon-btn ${sound ? 'on' : ''}`} onClick={() => { unlockAudio(); setSound(!sound); }} aria-pressed={sound} title={sound ? 'Sound effects on' : 'Sound effects off'} aria-label="Sound effects">
            <Icon name={sound ? 'sound' : 'sound-off'} size={19} />
          </button>
          <button className={`icon-btn ${music ? 'on' : ''}`} onClick={() => { unlockAudio(); setMusic(!music); }} aria-pressed={music} title={music ? 'Music on' : 'Music off'} aria-label="Background music">
            <Icon name={music ? 'music' : 'music-off'} size={19} />
          </button>
          <button className={`icon-btn ${voice ? 'on' : ''}`} onClick={() => setVoice(!voice)} aria-pressed={voice} title={voice ? 'Voice guide on' : 'Voice guide off'} aria-label="Voice guide">
            <Icon name={voice ? 'voice' : 'voice-off'} size={19} />
          </button>
        </div>
      </header>
      <main>
        {section === 'home' && <Home onStart={startScan} onDemo={startDemo} />}
        {section === 'learn' && (route.sub ? <LessonPage id={route.sub} /> : <LearnHub />)}
        {section === 'tricks' && <Tricks tab={route.sub} />}
        {section === 'speed' && <Speed tab={route.sub} />}
        {section === 'solve' && screen === 'scan' && (
          <Scan
            onDone={(state, names) => {
              setCube({ state, names, source: 'scan' });
              // "rescan & continue": straight back to the guide with the same route if the scan is clean
              go(resume && validate(state, names).ok ? 'solve' : 'review');
            }}
            onDemo={startDemo}
            onManual={startManual}
          />
        )}
        {section === 'solve' && screen === 'review' && cube && <Review cube={cube} onChange={setCube} onSolve={() => go('solve')} onRescan={() => go('scan')} />}
        {section === 'solve' && screen === 'solve' && cube && (
          <Solve
            key={cube.state.join('')}
            cube={cube}
            initialMethod={resume}
            onDone={(s) => { setStats(s); setResume(undefined); go('done'); }}
            onBack={() => go('review')}
            onRescan={(m) => { setResume(m); go('scan'); }}
          />
        )}
        {section === 'solve' && screen === 'done' && <Done stats={stats} onAgain={startScan} onHome={() => nav('/')} onDemo={startDemo} />}
      </main>
      <nav className="bottomnav" aria-label="Sections">
        <button className={section === 'home' ? 'on' : ''} onClick={() => nav('/')}><Icon name="home" size={21} />Home</button>
        {NAV.map((n) => (
          <button key={n.id} className={section === n.id ? 'on' : ''} onClick={() => { sfx.tap(); if (n.id === 'solve') startScan(); else nav(`/${n.id}`); }}>
            <Icon name={n.icon} size={21} />{n.label}
          </button>
        ))}
      </nav>
    </div>
  );
}
