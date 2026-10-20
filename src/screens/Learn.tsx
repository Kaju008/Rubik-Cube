import { useEffect, useMemo, useState } from 'react';
import { Icon } from '../ui/Icon';
import { LESSONS, TRACKS, lessonById, loadDone, saveDone, TOTAL_XP, Block, Lesson } from '../learn/lessons';
import { OLL_EDGES, OLL_CORNERS, PLL, Alg } from '../learn/algs';
import { AlgPlayer } from '../ui/AlgPlayer';
import { PiecesExplorer, NotationPad } from '../ui/LearnWidgets';
import { AlgGrid } from '../ui/AlgGrid';
import { Mascot } from '../ui/Mascot';
import { Confetti } from '../ui/Confetti';
import { applyMoves, solvedState } from '../cube/model';
import { solveCross } from '../cube/beginner';
import { speak, stopVoice } from '../audio/voice';
import { sfx } from '../audio/sfx';
import { nav } from '../router';

function Ring({ pct, size = 92 }: { pct: number; size?: number }) {
  const r = 40, C = 2 * Math.PI * r;
  return (
    <svg viewBox="0 0 100 100" width={size} height={size} className="ring" aria-hidden="true">
      <circle cx="50" cy="50" r={r} className="ring-bg" />
      <circle cx="50" cy="50" r={r} className="ring-fg" strokeDasharray={C} strokeDashoffset={C * (1 - pct)} />
      <text x="50" y="57" textAnchor="middle">{Math.round(pct * 100)}%</text>
    </svg>
  );
}

export function useLearnProgress() {
  const [done, setDone] = useState<string[]>(() => loadDone());
  const xp = LESSONS.filter((l) => done.includes(l.id)).reduce((n, l) => n + l.xp, 0);
  const complete = (id: string) => setDone((d) => { const n = d.includes(id) ? d : [...d, id]; saveDone(n); return n; });
  return { done, xp, complete };
}

export function LearnHub() {
  const { done, xp } = useLearnProgress();
  const next = LESSONS.find((l) => !done.includes(l.id)) ?? LESSONS[0];
  useEffect(() => () => stopVoice(), []);
  return (
    <div className="section-page learn">
      <header className="section-hero card">
        <Mascot size={86} className="bob" id="learn" />
        <div className="sh-text">
          <p className="eyebrow">Learn</p>
          <h1>From first twist to <span className="grad">speedcuber</span></h1>
          <p className="muted">Short lessons with a 3D cube that plays every move for you. Your progress is saved on this device.</p>
          <div className="row">
            <button className="btn-toy" onClick={() => { sfx.start(); nav(`/learn/${next.id}`); }}>{done.length ? 'Continue' : 'Start learning'}: {next.title}<Icon name="arrow-right" size={18} /></button>
            <button className="btn-ghost" onClick={() => speak('learn_intro')}><Icon name="play" size={14} />Hear intro</button>
          </div>
        </div>
        <div className="sh-stats">
          <Ring pct={done.length / LESSONS.length} />
          <p><b>{done.length}</b>/{LESSONS.length} lessons</p>
          <p><b className="grad">{xp}</b> / {TOTAL_XP} XP</p>
        </div>
      </header>

      {TRACKS.map((t, ti) => {
        const lessons = LESSONS.filter((l) => l.track === t.id);
        const n = lessons.filter((l) => done.includes(l.id)).length;
        return (
          <section key={t.id} className="track" style={{ ['--acc' as string]: t.color }}>
            <div className="track-head">
              <span className="track-n">{ti + 1}</span>
              <div>
                <h2>{t.title} <span className="tag">{t.level}</span></h2>
                <p className="muted">{t.blurb} · {n}/{lessons.length} done</p>
              </div>
            </div>
            <div className="lesson-grid">
              {lessons.map((l) => (
                <button key={l.id} className={`lesson-card ${done.includes(l.id) ? 'done' : ''} ${l.id === next.id ? 'next' : ''}`} onClick={() => { sfx.tap(); nav(`/learn/${l.id}`); }}>
                  <span className="lc-emoji" aria-hidden="true"><Icon name={l.emoji} size={22} /></span>
                  <span className="lc-body">
                    <b>{l.title}</b>
                    <span>{l.summary}</span>
                    <small>{l.minutes} min · +{l.xp} XP</small>
                  </span>
                  <span className="lc-check" aria-label={done.includes(l.id) ? 'Completed' : 'Not done yet'}>{done.includes(l.id) ? <Icon name="check" size={15} /> : l.id === next.id ? <Icon name="play" size={11} /> : null}</span>
                </button>
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}

const SETS: Record<string, Alg[]> = { oll2e: OLL_EDGES, oll2c: OLL_CORNERS, pll2: PLL.filter((a) => a.twoLook), pll: PLL };

function BlockView({ b, onWatch }: { b: Block; onWatch: (a: Alg) => void }) {
  switch (b.kind) {
    case 'text': return <p className="lesson-text">{b.text}</p>;
    case 'tip': return <p className="lesson-tip"><Icon name="bulb" size={18} /><span>{b.text}</span></p>;
    case 'pieces': return <PiecesExplorer />;
    case 'notation': return <NotationPad />;
    case 'demo': return <AlgPlayer title={b.title} alg={b.alg} setup={b.setup} caption={b.caption} />;
    case 'cross-demo': {
      const start = applyMoves(solvedState(), b.setup);
      return <AlgPlayer title={b.title} alg={solveCross(start).join(' ')} start={start} caption={b.caption} />;
    }
    case 'algset': return <div className="algset"><h3>{b.title}</h3><AlgGrid algs={SETS[b.set]} mode={b.set.startsWith('oll') ? 'oll' : 'pll'} onWatch={onWatch} /></div>;
    case 'practice': return (
      <div className="lesson-practice card">
        <span className="lp-text"><Icon name="target" size={20} />{b.text}</span>
        <button className="btn-toy" onClick={() => nav(b.to === 'solve' ? '/solve' : `/${b.to}`)}>{b.to === 'solve' ? 'Scan & solve' : b.to === 'speed' ? 'Open Speed' : 'Open Tricks'}<Icon name="arrow-right" size={18} /></button>
      </div>
    );
  }
}

export function AlgModal({ alg, mode, onClose }: { alg: Alg; mode: 'oll' | 'pll'; onClose: () => void }) {
  useEffect(() => {
    const k = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    addEventListener('keydown', k);
    return () => removeEventListener('keydown', k);
  }, [onClose]);
  return (
    <div className="modal" role="dialog" aria-label={alg.name} onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal-card card">
        <button className="modal-x" onClick={onClose} aria-label="Close"><Icon name="close" size={18} /></button>
        <p className="eyebrow">{mode === 'oll' ? 'OLL' : 'PLL'} · {alg.group ?? (alg.set === 'oll2e' ? 'Yellow cross' : 'Yellow corners')}</p>
        <h2>{alg.name}</h2>
        {alg.tip && <p className="muted">{alg.tip}</p>}
        <AlgPlayer alg={alg.alg} />
      </div>
    </div>
  );
}

export function LessonPage({ id }: { id: string }) {
  const lesson = lessonById(id) as Lesson | undefined;
  const { done, complete } = useLearnProgress();
  const [watch, setWatch] = useState<Alg | null>(null);
  const [party, setParty] = useState(false);
  const idx = LESSONS.findIndex((l) => l.id === id);
  const next = LESSONS[idx + 1];
  const track = useMemo(() => TRACKS.find((t) => t.id === lesson?.track), [lesson]);

  useEffect(() => { window.scrollTo(0, 0); setParty(false); const l = lessonById(id); if (l) speak(l.voice); return () => stopVoice(); }, [id]);
  if (!lesson) return <div className="center-card card"><h2>Lesson not found</h2><button className="btn-toy" onClick={() => nav('/learn')}>Back to Learn</button></div>;
  const isDone = done.includes(lesson.id);

  const finish = () => {
    complete(lesson.id);
    sfx.stage();
    speak('lesson_done');
    setParty(true);
    setTimeout(() => setParty(false), 4200);
  };

  return (
    <div className="section-page lesson" style={{ ['--acc' as string]: track?.color }}>
      {party && <Confetti />}
      <button className="crumb" onClick={() => nav('/learn')}><Icon name="arrow-left" size={16} />Learn · {track?.title}</button>
      <header className="lesson-head">
        <span className="lh-emoji" aria-hidden="true"><Icon name={lesson.emoji} size={32} /></span>
        <div>
          <p className="eyebrow">{track?.level} · {lesson.minutes} min · +{lesson.xp} XP</p>
          <h1>{lesson.title}</h1>
          <p className="muted">{lesson.summary}</p>
        </div>
        <button className="btn-ghost" onClick={() => speak(lesson.voice)}><Icon name="sound" size={17} />Listen</button>
      </header>
      <article className="lesson-body">
        {lesson.blocks.map((b, k) => <BlockView key={k} b={b} onWatch={setWatch} />)}
      </article>
      <footer className="lesson-foot card">
        {isDone ? <span className="lf-done"><Icon name="check" size={18} />Lesson complete</span> : <span>Got it? Mark it done to earn <b>+{lesson.xp} XP</b>.</span>}
        <div className="row">
          {!isDone && <button className="btn-toy" onClick={finish}><Icon name="check" size={18} />Mark complete</button>}
          {next && <button className={isDone ? 'btn-toy' : 'btn-ghost'} onClick={() => nav(`/learn/${next.id}`)}>Next: {next.title}<Icon name="arrow-right" size={18} /></button>}
        </div>
      </footer>
      {watch && <AlgModal alg={watch} mode={watch.set === 'pll' ? 'pll' : 'oll'} onClose={() => setWatch(null)} />}
    </div>
  );
}
