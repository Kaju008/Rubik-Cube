// Beginner layer-by-layer solver. Produces teachable stages (cross → corners → middle → yellow cross →
// yellow edges → corner positions → corner twists) using the classic beginner algorithms, so what the
// learner sees on screen is exactly what they'd learn in a tutorial.
import {
  State, Perm, algPerm, applyPerm, applyMoves, parseAlg, MOVE_PERMS, isSolved, simplify, isRotation, moveAmount, makeMove,
} from './model';
import { CORNERS, EDGES, PARTNERS } from './pieces';

export interface Chunk { label: string; moves: string[]; kind?: 'rotate' | 'adjust' | 'alg'; voice?: string }
export interface Stage { id: string; title: string; goal: string; tip: string; chunks: Chunk[] }
export interface Solution { method: 'beginner' | 'fast'; stages: Stage[]; moveCount: number }

// ---------- helpers ----------
const centreOf = (i: number) => Math.floor(i / 9) * 9 + 4;
const faceletOK = (s: State, i: number) => s[i] === s[centreOf(i)];
const slotOK = (s: State, facelets: number[]) => facelets.every((i) => faceletOK(s, i));

const D_EDGES = EDGES.filter((e) => e.pos[1] === -1);
const D_CORNERS = CORNERS.filter((c) => c.pos[1] === -1);
const MID_EDGES = EDGES.filter((e) => e.pos[1] === 0);
const U_EDGES = EDGES.filter((e) => e.pos[1] === 1);
const U_CORNERS = CORNERS.filter((c) => c.pos[1] === 1);

const crossOK = (s: State) => D_EDGES.every((e) => slotOK(s, e.facelets));
const firstLayerOK = (s: State) => crossOK(s) && D_CORNERS.every((c) => slotOK(s, c.facelets));
const f2lOK = (s: State) => firstLayerOK(s) && MID_EDGES.every((e) => slotOK(s, e.facelets));

const yRot = (k: number): string[] => [[], ['y'], ['y2'], ["y'"]][((k % 4) + 4) % 4];

interface Macro { label: string; moves: string[]; perm: Perm; slot: number; isU: boolean; family: string; voice?: string }

function uMacros(): Macro[] {
  return ['U', 'U2', "U'"].map((m) => ({
    label: 'Turn the top layer to line things up', moves: [m], perm: MOVE_PERMS[m], slot: 0, isU: true, family: 'U',
  }));
}

function algMacro(alg: string, label: string, slot: number, family: string, voice?: string): Macro {
  const moves = parseAlg(alg);
  return { label, moves, perm: algPerm([...yRot(slot), ...moves, ...yRot(-slot)]), slot, isU: false, family, voice };
}

/** Turn a list of macros (found in a fixed frame) into chunks with explicit whole-cube rotations. */
function emit(macros: Macro[]): Chunk[] {
  const chunks: Chunk[] = [];
  let offset = 0;
  for (const m of macros) {
    if (m.isU) { pushChunk(chunks, { label: m.label, moves: [...m.moves], kind: 'adjust' }); continue; }
    const rel = yRot(m.slot - offset);
    if (rel.length) pushChunk(chunks, { label: 'Turn the whole cube', moves: rel, kind: 'rotate' });
    offset = m.slot;
    pushChunk(chunks, { label: m.label, moves: [...m.moves], kind: 'alg', voice: m.voice });
  }
  return chunks;
}

/** Append a chunk, merging same-face moves across the boundary (U then U' cancels). */
export function pushChunk(chunks: Chunk[], c: Chunk) {
  const moves = [...c.moves];
  const prev = chunks[chunks.length - 1];
  // never rewrite a named algorithm — learners must see it exactly as taught
  const canMerge = prev && prev.kind !== 'alg' && c.kind !== 'alg';
  while (canMerge && prev.moves.length && moves.length && prev.moves[prev.moves.length - 1][0] === moves[0][0]) {
    const a = prev.moves.pop()!;
    const b = moves.shift()!;
    const merged = makeMove(a[0], moveAmount(a) + moveAmount(b));
    if (merged) prev.moves.push(merged);
  }
  if (prev && prev.moves.length === 0) chunks.pop();
  if (moves.length) {
    const last = chunks[chunks.length - 1];
    if (last && last.label === c.label && last.kind === c.kind && c.kind !== 'alg') last.moves = simplify([...last.moves, ...moves]);
    else chunks.push({ ...c, moves });
  }
}

const countMoves = (chunks: Chunk[]) => chunks.reduce((n, c) => n + c.moves.length, 0);

/** Iterative-deepening search over macros; returns the cheapest sequence at the shallowest depth. */
function macroSearch(s: State, macros: Macro[], goal: (s: State) => boolean, maxDepth: number): Macro[] | null {
  if (goal(s)) return [];
  for (let d = 1; d <= maxDepth; d++) {
    let best: Macro[] | null = null;
    let bestCost = Infinity;
    const path: Macro[] = [];
    const rec = (st: State) => {
      if (path.length === d) {
        if (goal(st)) {
          const cost = countMoves(emit(path));
          if (cost < bestCost) { bestCost = cost; best = [...path]; }
        }
        return;
      }
      for (const m of macros) {
        const last = path[path.length - 1];
        if (last && last.family === m.family && (m.isU || last.slot === m.slot)) continue;
        path.push(m);
        rec(applyPerm(st, m.perm));
        path.pop();
      }
    };
    rec(s);
    if (best) return best;
  }
  return null;
}

// ---------- stage 1: white cross (BFS table, optimal) ----------
const EDGE_FACELETS: number[] = EDGES.flatMap((e) => e.facelets);
const EF_INDEX = new Int16Array(54).fill(-1);
EDGE_FACELETS.forEach((f, i) => (EF_INDEX[f] = i));
const FACE_MOVES = ['U', 'U2', "U'", 'R', 'R2', "R'", 'F', 'F2', "F'", 'D', 'D2', "D'", 'L', 'L2', "L'", 'B', 'B2', "B'"];
const MOVE_EF = FACE_MOVES.map((m) => EDGE_FACELETS.map((f) => EF_INDEX[MOVE_PERMS[m][f]]));
const CROSS_TARGETS = D_EDGES.map((e) => e.facelets[0]); // D stickers of the four bottom edges
let crossTable: Uint8Array | null = null;

const enc = (a: number, b: number, c: number, d: number) => ((a * 24 + b) * 24 + c) * 24 + d;

function buildCrossTable() {
  const N = 24 ** 4;
  const dist = new Uint8Array(N).fill(255);
  const t = CROSS_TARGETS.map((f) => EF_INDEX[f]);
  let frontier = [enc(t[0], t[1], t[2], t[3])];
  dist[frontier[0]] = 0;
  let depth = 0;
  while (frontier.length) {
    const next: number[] = [];
    for (const idx of frontier) {
      const a = Math.floor(idx / 13824), b = Math.floor(idx / 576) % 24, c = Math.floor(idx / 24) % 24, d = idx % 24;
      for (const me of MOVE_EF) {
        const n = enc(me[a], me[b], me[c], me[d]);
        if (dist[n] === 255) { dist[n] = depth + 1; next.push(n); }
      }
    }
    frontier = next;
    depth++;
  }
  crossTable = dist;
}

export function solveCross(s: State): string[] {
  if (!crossTable) buildCrossTable();
  const white = s[31];
  const loc = CROSS_TARGETS.map((target) => {
    const other = s[centreOf(PARTNERS[target][0])];
    for (const e of EDGES) {
      const [i, j] = e.facelets;
      if (s[i] === white && s[j] === other) return EF_INDEX[i];
      if (s[j] === white && s[i] === other) return EF_INDEX[j];
    }
    throw new Error('cross edge missing');
  });
  let cur = enc(loc[0], loc[1], loc[2], loc[3]);
  const out: string[] = [];
  let guard = 0;
  while (crossTable![cur] > 0 && guard++ < 20) {
    const dcur = crossTable![cur];
    const a = Math.floor(cur / 13824), b = Math.floor(cur / 576) % 24, c = Math.floor(cur / 24) % 24, d = cur % 24;
    for (let mi = 0; mi < FACE_MOVES.length; mi++) {
      const me = MOVE_EF[mi];
      const n = enc(me[a], me[b], me[c], me[d]);
      if (crossTable![n] === dcur - 1) { out.push(FACE_MOVES[mi]); cur = n; break; }
    }
  }
  return out;
}

// ---------- the solver ----------
const STAGE_INFO: Record<string, { title: string; goal: string; tip: string }> = {
  cross: { title: 'White cross', goal: 'Make a white plus on the bottom, each edge matching its side centre.', tip: 'Edges first — the centres never move, so they tell you where everything goes.' },
  corners: { title: 'White corners', goal: 'Fill the four bottom corners to finish the first layer.', tip: "Park the corner above its spot, then repeat R U R' U' until it drops in." },
  middle: { title: 'Middle layer', goal: 'Slot the four middle edges.', tip: 'Match the edge with its centre, then insert it right or left.' },
  ycross: { title: 'Yellow cross', goal: 'Turn the top into a yellow plus.', tip: "F R U R' U' F' — dot → L → line → cross." },
  yedges: { title: 'Yellow edges', goal: 'Match the top edges with their side colours.', tip: "R U R' U R U2 R' swaps edges around the top." },
  ycorners: { title: 'Corner homes', goal: 'Move each top corner to its home spot.', tip: "U R U' L' U R' U' L cycles three corners." },
  twist: { title: 'Twist corners', goal: 'Spin each top corner until yellow faces up.', tip: "R' D' R D — trust it, the bottom fixes itself at the end!" },
};

const stage = (id: string, chunks: Chunk[]): Stage => ({ id, ...STAGE_INFO[id], chunks });

export function solveBeginner(start: State): Solution {
  let s = start;
  const stages: Stage[] = [];
  const run = (chunks: Chunk[]) => { for (const c of chunks) s = applyMoves(s, c.moves); };

  // 1. cross
  const cross = solveCross(s);
  const crossChunks: Chunk[] = cross.length ? [{ label: 'Build the white cross on the bottom', moves: cross, kind: 'alg', voice: 'alg_cross' }] : [];
  run(crossChunks);
  stages.push(stage('cross', crossChunks));
  if (!crossOK(s)) throw new Error('cross failed');

  // 2. first-layer corners — one at a time, cheapest first
  {
    const chunks: Chunk[] = [];
    const macros = [...uMacros()];
    for (let k = 0; k < 4; k++)
      for (let n = 1; n <= 5; n++)
        macros.push(algMacro(Array(n).fill("R U R' U'").join(' '), n === 1 ? "R U R' U'" : `R U R' U' × ${n}`, k, 'sexy', `alg_sexy_${n}`));
    for (let guard = 0; guard < 4 && !firstLayerOK(s); guard++) {
      const done = D_CORNERS.filter((c) => slotOK(s, c.facelets));
      let best: Chunk[] | null = null;
      for (const target of D_CORNERS) {
        if (slotOK(s, target.facelets)) continue;
        const res = macroSearch(s, macros, (st) => crossOK(st) && slotOK(st, target.facelets) && done.every((c) => slotOK(st, c.facelets)), 3);
        if (res) { const e = emit(res); if (!best || countMoves(e) < countMoves(best)) best = e; }
      }
      if (!best) break;
      run(best);
      best.forEach((c) => pushChunk(chunks, c));
    }
    stages.push(stage('corners', chunks));
  }

  // 3. middle edges
  if (firstLayerOK(s)) {
    const chunks: Chunk[] = [];
    const macros = [...uMacros()];
    for (let k = 0; k < 4; k++) {
      macros.push(algMacro("U R U' R' U' F' U F", 'Insert right: U R U\' R\' U\' F\' U F', k, 'right', 'alg_right'));
      macros.push(algMacro("U' L' U L U F U' F'", "Insert left: U' L' U L U F U' F'", k, 'left', 'alg_left'));
    }
    for (let guard = 0; guard < 4 && !f2lOK(s); guard++) {
      const done = MID_EDGES.filter((e) => slotOK(s, e.facelets));
      let best: Chunk[] | null = null;
      for (const target of MID_EDGES) {
        if (slotOK(s, target.facelets)) continue;
        const res = macroSearch(s, macros, (st) => firstLayerOK(st) && slotOK(st, target.facelets) && done.every((e) => slotOK(st, e.facelets)), 3);
        if (res) { const e = emit(res); if (!best || countMoves(e) < countMoves(best)) best = e; }
      }
      if (!best) break;
      run(best);
      best.forEach((c) => pushChunk(chunks, c));
    }
    stages.push(stage('middle', chunks));
  }

  // 4–6. last layer with the canonical beginner algorithms (+ U turns / whole-cube turns)
  const llStage = (id: string, macros: Macro[], goal: (st: State) => boolean, depth: number) => {
    if (!f2lOK(s)) return;
    const res = macroSearch(s, macros, goal, depth);
    if (!res) return;
    const chunks = emit(res);
    run(chunks);
    stages.push(stage(id, chunks));
  };
  const yEdgesUp = (st: State) => [1, 3, 5, 7].every((i) => st[i] === st[4]);
  const uEdgesOK = (st: State) => U_EDGES.every((e) => slotOK(st, e.facelets));
  const uCornersPlaced = (st: State) =>
    U_CORNERS.every((c) => {
      const have = c.facelets.map((i) => st[i]).sort().join();
      const want = c.facelets.map((i) => st[centreOf(i)]).sort().join();
      return have === want;
    });

  llStage('ycross', [...uMacros(), algMacro("F R U R' U' F'", "F R U R' U' F'", 0, 'fru', 'alg_fru')], (st) => f2lOK(st) && yEdgesUp(st), 5);
  llStage('yedges', [...uMacros(), algMacro("R U R' U R U2 R'", "R U R' U R U2 R'", 0, 'sune', 'alg_sune')], (st) => f2lOK(st) && uEdgesOK(st), 5);
  llStage('ycorners', [0, 1, 2, 3].map((k) => algMacro("U R U' L' U R' U' L", "U R U' L' U R' U' L", k, 'niklas', 'alg_niklas')), (st) => f2lOK(st) && uEdgesOK(st) && uCornersPlaced(st), 3);

  // 7. twist corners (R' D' R D at front-right, turning only the top between corners)
  if (f2lOK(s) && uEdgesOK(s) && uCornersPlaced(s) && !isSolved(s)) {
    const chunks: Chunk[] = [];
    for (let i = 0; i < 4; i++) {
      let reps = 0;
      while (s[8] !== s[4] && reps < 6) { s = applyMoves(s, "R' D' R D R' D' R D"); reps += 2; }
      if (reps) pushChunk(chunks, { label: `R' D' R D × ${reps}`, moves: parseAlg(Array(reps).fill("R' D' R D").join(' ')), kind: 'alg', voice: `alg_twist_${reps}` });
      if (i < 3) { s = applyMoves(s, ['U']); pushChunk(chunks, { label: 'Turn only the top: bring the next corner to front-right', moves: ['U'], kind: 'adjust' }); }
    }
    for (const m of ['', 'U', 'U2', "U'"]) {
      const t = m ? applyMoves(s, [m]) : s;
      if (isSolved(t)) { if (m) pushChunk(chunks, { label: 'Final turn of the top — solved!', moves: [m], kind: 'adjust' }); s = t; break; }
    }
    stages.push(stage('twist', chunks));
  } else if (f2lOK(s) && uEdgesOK(s) && uCornersPlaced(s)) {
    stages.push(stage('twist', []));
  }

  if (!isSolved(s)) throw new Error('beginner solver incomplete');
  const moveCount = stages.reduce((n, st) => n + st.chunks.reduce((m, c) => m + c.moves.filter((x) => !isRotation(x)).length, 0), 0);
  return { method: 'beginner', stages, moveCount };
}

export function fastSolution(moves: string[]): Solution {
  const chunks: Chunk[] = [];
  for (let i = 0; i < moves.length; i += 4) chunks.push({ label: `Moves ${i + 1}–${Math.min(i + 4, moves.length)}`, moves: moves.slice(i, i + 4), kind: 'alg' });
  return {
    method: 'fast',
    stages: [{ id: 'fast', title: 'Fast solve', goal: `Solve it in ${moves.length} moves.`, tip: 'Computer-optimal route — near the fewest moves possible.', chunks }],
    moveCount: moves.length,
  };
}
