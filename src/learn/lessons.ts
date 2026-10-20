// The Learn curriculum: basics → beginner method → 4-look last layer → CFOP.
export type Block =
  | { kind: 'text'; text: string }
  | { kind: 'tip'; text: string }
  | { kind: 'pieces' }
  | { kind: 'notation' }
  | { kind: 'demo'; title: string; alg: string; setup?: string; caption?: string; loopFromSolved?: boolean }
  | { kind: 'cross-demo'; title: string; setup: string; caption?: string }
  | { kind: 'algset'; set: 'oll2e' | 'oll2c' | 'pll2' | 'pll'; title: string }
  | { kind: 'practice'; text: string; to: 'solve' | 'speed' | 'tricks' };

export interface Lesson { id: string; track: string; title: string; emoji: string /* icon name */; minutes: number; summary: string; voice: string; xp: number; blocks: Block[] }
export interface Track { id: string; title: string; level: 'Beginner' | 'Intermediate' | 'Advanced'; blurb: string; color: string }

export const TRACKS: Track[] = [
  { id: 'basics', title: 'Basics', level: 'Beginner', blurb: 'Know your cube and speak its language.', color: 'var(--green)' },
  { id: 'beginner', title: 'Solve it: beginner method', level: 'Beginner', blurb: 'Seven stages from scrambled to solved.', color: 'var(--yellow)' },
  { id: 'intermediate', title: '4-look last layer', level: 'Intermediate', blurb: 'Fewer moves, faster finishes.', color: 'var(--orange)' },
  { id: 'advanced', title: 'CFOP speed method', level: 'Advanced', blurb: 'The method world-class cubers use.', color: 'var(--pink)' },
];

export const LESSONS: Lesson[] = [
  // ---------------- basics ----------------
  {
    id: 'meet', track: 'basics', title: 'Meet the cube', emoji: 'cube', minutes: 2, xp: 10, voice: 'lesson_meet',
    summary: 'Centres, edges and corners: the three kinds of pieces.',
    blocks: [
      { kind: 'text', text: 'A cube has 26 visible pieces, and there are only three kinds. Tap each kind below to light it up.' },
      { kind: 'pieces' },
      { kind: 'text', text: 'The 6 centres never move relative to each other, so a side is always the colour of its centre. The 12 edges have two colours and the 8 corners have three.' },
      { kind: 'tip', text: 'You don’t solve sides. You put pieces in their homes. The centres tell you where home is.' },
      { kind: 'text', text: 'In Cubr we always hold the cube the same way: yellow on top, white on the bottom, red facing you.' },
    ],
  },
  {
    id: 'notation', track: 'basics', title: 'Move notation', emoji: 'letters', minutes: 4, xp: 10, voice: 'lesson_notation',
    summary: 'R, U, F, prime and 2: read any algorithm.',
    blocks: [
      { kind: 'text', text: 'Each face has a letter: R (right), L (left), U (up/top), D (down/bottom), F (front), B (back). A plain letter means a clockwise quarter turn, as if you were looking straight at that face.' },
      { kind: 'text', text: 'A prime (R′) means turn it the other way. A 2 (R2) means a half turn. Try every move on the 3D cube:' },
      { kind: 'notation' },
      { kind: 'tip', text: 'R goes up, L goes down, U goes left, D goes right, as seen from the front. Say it out loud while you turn!' },
    ],
  },
  {
    id: 'trigger', track: 'basics', title: 'The trigger move', emoji: 'bolt', minutes: 3, xp: 10, voice: 'lesson_trigger',
    summary: 'R U R′ U′, the most famous four moves in cubing.',
    blocks: [
      { kind: 'text', text: 'R U R′ U′ is called the trigger (or "sexy move"). It shows up everywhere: in the beginner method, in F2L and in OLL. Get it into your fingers.' },
      { kind: 'demo', title: 'Trigger move', alg: "R U R' U'", setup: '', caption: 'Right up, top left, right down, top right.' },
      { kind: 'demo', title: 'Six triggers = back to solved', alg: "R U R' U' R U R' U' R U R' U' R U R' U' R U R' U' R U R' U'", setup: '', caption: 'Do it 6 times on a solved cube. It comes back!' },
      { kind: 'tip', text: 'Hold the cube with your thumbs on the front. Push R up with your right wrist, and flick U with your right index finger.' },
    ],
  },
  // ---------------- beginner method ----------------
  {
    id: 'cross', track: 'beginner', title: 'Stage 1 · White cross', emoji: 'plus', minutes: 5, xp: 15, voice: 'lesson_cross',
    summary: 'Build a white plus on the bottom that matches the side centres.',
    blocks: [
      { kind: 'text', text: 'Goal: the four white edges sit around the white centre on the bottom, and each edge’s other colour matches its side centre.' },
      { kind: 'text', text: 'Find a white edge, turn its side so the edge is in the top layer, then line its other colour up with the matching centre and turn that side twice to bring it down.' },
      { kind: 'cross-demo', title: 'A cross, move by move', setup: "F R' U L' D2 B", caption: 'Watch the white edges drop into place.' },
      { kind: 'tip', text: 'Stuck? Make a "daisy" first: four white edges around the yellow centre on top. Then match each one with its centre and turn that side twice.' },
    ],
  },
  {
    id: 'corners', track: 'beginner', title: 'Stage 2 · White corners', emoji: 'corner', minutes: 5, xp: 15, voice: 'lesson_corners',
    summary: 'Park the corner, repeat the trigger until it drops in.',
    blocks: [
      { kind: 'text', text: 'Find a corner with white in the top layer. Turn the top until the corner sits right above the spot where it belongs, at the front-right.' },
      { kind: 'demo', title: 'Repeat R U R′ U′', alg: "R U R' U' R U R' U' R U R' U' R U R' U' R U R' U'", setup: "R U R' U'", caption: 'Here it takes five triggers. Sometimes one, three or five.' },
      { kind: 'tip', text: 'If a white corner is stuck in the bottom in the wrong place, do one trigger to pop it up to the top layer.' },
    ],
  },
  {
    id: 'middle', track: 'beginner', title: 'Stage 3 · Middle layer', emoji: 'layers', minutes: 6, xp: 15, voice: 'lesson_middle',
    summary: 'Match an edge with its centre, insert it right or left.',
    blocks: [
      { kind: 'text', text: 'Flip the cube so white is on the bottom (the Cubr way). Find a top-layer edge with no yellow. Turn the top so its front colour matches the front centre.' },
      { kind: 'demo', title: 'Insert to the right', alg: "U R U' R' U' F' U F", caption: 'The edge’s top colour matches the right centre.' },
      { kind: 'demo', title: 'Insert to the left', alg: "U' L' U L U F U' F'", caption: 'The edge’s top colour matches the left centre.' },
      { kind: 'tip', text: 'Edge stuck in the middle the wrong way round? Insert any top edge into that slot to pop it out.' },
    ],
  },
  {
    id: 'ycross', track: 'beginner', title: 'Stage 4 · Yellow cross', emoji: 'plus', minutes: 4, xp: 15, voice: 'lesson_ycross',
    summary: 'F R U R′ U′ F′: dot → L → line → cross.',
    blocks: [
      { kind: 'text', text: 'Look at the yellow top. You’ll see a dot, an L, a line, or already a cross. One algorithm takes you through all of them.' },
      { kind: 'demo', title: 'Line → cross', alg: "F R U R' U' F'", caption: 'Hold the line horizontally, then do the algorithm.' },
      { kind: 'tip', text: 'For an L, hold it at the back-left, like the hands of a clock at 9 and 12. For a dot, do the algorithm, then look again.' },
    ],
  },
  {
    id: 'yedges', track: 'beginner', title: 'Stage 5 · Yellow edges', emoji: 'swap', minutes: 4, xp: 15, voice: 'lesson_yedges',
    summary: 'Match the top edges to their sides with R U R′ U R U2 R′.',
    blocks: [
      { kind: 'text', text: 'Turn the top until two edges match their side centres. If they are next to each other, hold them at the back and the right, then do the algorithm.' },
      { kind: 'demo', title: 'Swap edges', alg: "R U R' U R U2 R'", caption: 'Then turn the top to line everything up.' },
      { kind: 'tip', text: 'If the matching edges are opposite each other, do the algorithm once from any side, then try again.' },
    ],
  },
  {
    id: 'ycorners', track: 'beginner', title: 'Stage 6 · Corner homes', emoji: 'home', minutes: 4, xp: 15, voice: 'lesson_ycorners',
    summary: 'U R U′ L′ U R′ U′ L cycles three corners.',
    blocks: [
      { kind: 'text', text: 'A corner is "home" when its three colours match the three centres around it, even if it’s twisted. Find a corner that is home and hold it at the front-right.' },
      { kind: 'demo', title: 'Cycle three corners', alg: "U R U' L' U R' U' L", caption: 'Repeat until every corner is home.' },
      { kind: 'tip', text: 'No corner home at all? Do the algorithm once from anywhere, and one will be.' },
    ],
  },
  {
    id: 'twist', track: 'beginner', title: 'Stage 7 · Twist the corners', emoji: 'twist', minutes: 5, xp: 20, voice: 'lesson_twist',
    summary: 'R′ D′ R D until yellow faces up. Trust the process!',
    blocks: [
      { kind: 'text', text: 'Hold an unsolved corner at the front-right of the top. Repeat R′ D′ R D until its yellow sticker faces up (2 or 4 times). Then turn ONLY the top to bring the next corner there.' },
      { kind: 'demo', title: 'Twist one corner', alg: "R' D' R D R' D' R D", caption: 'The bottom gets messy in the middle. It fixes itself!' },
      { kind: 'tip', text: 'Never turn the whole cube during this stage. Only turn the top layer between corners.' },
      { kind: 'practice', text: 'You know the whole method! Scan your cube and solve it with the Learn route.', to: 'solve' },
    ],
  },
  // ---------------- intermediate ----------------
  {
    id: 'oll2', track: 'intermediate', title: '2-look OLL', emoji: 'grid', minutes: 10, xp: 25, voice: 'lesson_oll2',
    summary: 'Make the whole top yellow in two steps: 10 algorithms.',
    blocks: [
      { kind: 'text', text: 'OLL means Orient the Last Layer: make the whole top yellow. In 2-look OLL you first make the yellow cross (3 cases), then twist all the corners at once (7 cases).' },
      { kind: 'algset', set: 'oll2e', title: 'Step 1 · Yellow cross' },
      { kind: 'algset', set: 'oll2c', title: 'Step 2 · Yellow corners' },
      { kind: 'tip', text: 'Learn Sune and Antisune first. You can solve every corner case by repeating them.' },
    ],
  },
  {
    id: 'pll2', track: 'intermediate', title: '2-look PLL', emoji: 'cycle', minutes: 10, xp: 25, voice: 'lesson_pll2',
    summary: 'Place the last layer: corners first, then edges.',
    blocks: [
      { kind: 'text', text: 'PLL means Permute the Last Layer: move the yellow pieces to their homes. First fix the corners (T or Y perm), then the edges (U, H or Z perm).' },
      { kind: 'algset', set: 'pll2', title: 'The six 2-look PLLs' },
      { kind: 'tip', text: 'Look for "headlights": two corners on one side with the same colour. Put them at the back, then do the T-perm.' },
      { kind: 'practice', text: 'Drill these with the Algorithm trainer in Speed.', to: 'speed' },
    ],
  },
  // ---------------- advanced ----------------
  {
    id: 'f2l', track: 'advanced', title: 'F2L: pairs, not layers', emoji: 'puzzle', minutes: 12, xp: 30, voice: 'lesson_f2l',
    summary: 'Pair a corner with its edge and insert both at once.',
    blocks: [
      { kind: 'text', text: 'In CFOP you skip stages 2 and 3. Instead you join each white corner with its matching middle edge on top, then insert the pair in one go. That saves about 30 moves.' },
      { kind: 'demo', title: 'Basic insert', alg: "R U R'", caption: 'Pair ready on top, above its slot: in it goes.' },
      { kind: 'demo', title: 'Split pair', alg: "U R U' R'", caption: 'Corner and edge separated: the U turn lines them up.' },
      { kind: 'demo', title: 'Front-side insert', alg: "U' F' U F", caption: 'The same idea, mirrored onto the front face.' },
      { kind: 'tip', text: 'Look for the next pair while you insert the current one. That habit is called lookahead.' },
    ],
  },
  {
    id: 'pllfull', track: 'advanced', title: 'Full PLL: all 21', emoji: 'flag', minutes: 25, xp: 40, voice: 'lesson_pllfull',
    summary: 'One look, one algorithm, the last layer done.',
    blocks: [
      { kind: 'text', text: 'Full PLL replaces the two PLL steps with one. Learn them in groups: edges only, corners only, adjacent swaps, diagonal swaps and the four G-perms.' },
      { kind: 'algset', set: 'pll', title: 'All 21 PLLs' },
    ],
  },
  {
    id: 'faster', track: 'advanced', title: 'Going sub-30', emoji: 'rocket', minutes: 5, xp: 30, voice: 'lesson_faster',
    summary: 'Inspection, cross planning, lookahead and finger tricks.',
    blocks: [
      { kind: 'text', text: 'Plan your whole cross during the 15 seconds of inspection, and aim for 8 moves or fewer.' },
      { kind: 'text', text: 'Turn slower but without pauses. Smooth, steady turning beats fast bursts.' },
      { kind: 'text', text: 'Use finger tricks: flick U with your index finger, and turn R with your wrist. Never regrip in the middle of an algorithm.' },
      { kind: 'tip', text: 'Do 5 timed solves a day. Your average of 5 tells the truth; a single lucky solve doesn’t.' },
      { kind: 'practice', text: 'Open the Speed timer and set your first average.', to: 'speed' },
    ],
  },
];

export const lessonById = (id: string) => LESSONS.find((l) => l.id === id);
export const TOTAL_XP = LESSONS.reduce((n, l) => n + l.xp, 0);

// ---- progress (per device) ----
const KEY = 'cubr.learn.v1';
export function loadDone(): string[] { try { return JSON.parse(localStorage.getItem(KEY) || '[]'); } catch { return []; } }
export function saveDone(ids: string[]) { try { localStorage.setItem(KEY, JSON.stringify(ids)); } catch { /* private mode */ } }
