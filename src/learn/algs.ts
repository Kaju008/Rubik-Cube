// Algorithm library. Every entry is verified in tests/algs.test.ts (OLL keeps F2L, PLL keeps orientation, etc.).
export interface Alg { id: string; name: string; alg: string; set: 'oll2e' | 'oll2c' | 'pll'; tip?: string; group?: string; twoLook?: boolean }

export const OLL_EDGES: Alg[] = [
  { id: 'oll-line', name: 'Line', alg: "F R U R' U' F'", set: 'oll2e', tip: 'Hold the yellow line horizontal.' },
  { id: 'oll-l', name: 'L shape', alg: "f R U R' U' f'", set: 'oll2e', tip: 'Hold the L at the back-left (like 9 o’clock to 12).' },
  { id: 'oll-dot', name: 'Dot', alg: "F R U R' U' F' f R U R' U' f'", set: 'oll2e', tip: 'Line + L algorithms back to back.' },
];

export const OLL_CORNERS: Alg[] = [
  { id: 'oll-sune', name: 'Sune', alg: "R U R' U R U2 R'", set: 'oll2c', tip: 'One yellow corner up: put it front-left.' },
  { id: 'oll-antisune', name: 'Antisune', alg: "R U2 R' U' R U' R'", set: 'oll2c', tip: 'Mirror of Sune. Yellow corner at back-right.' },
  { id: 'oll-h', name: 'H (double headlights)', alg: "R U R' U R U' R' U R U2 R'", set: 'oll2c', tip: 'Yellow faces left and right on both sides.' },
  { id: 'oll-pi', name: 'Pi (bruno)', alg: "R U2 R2 U' R2 U' R2 U2 R", set: 'oll2c', tip: 'Headlights on the left side.' },
  { id: 'oll-u', name: 'Headlights (U)', alg: "R2 D R' U2 R D' R' U2 R'", set: 'oll2c', tip: 'Headlights facing you on the front.' },
  { id: 'oll-t', name: 'T (chameleon)', alg: "r U R' U' r' F R F'", set: 'oll2c', tip: 'Yellow on the left side stickers.' },
  { id: 'oll-bowtie', name: 'Bowtie (L)', alg: "F' r U R' U' r' F R", set: 'oll2c', tip: 'Diagonal corners up, one pointing at you.' },
];

export const PLL: Alg[] = [
  { id: 'pll-ua', name: 'Ua', alg: "R U' R U R U R U' R' U' R2", set: 'pll', group: 'Edges only', twoLook: true },
  { id: 'pll-ub', name: 'Ub', alg: "R2 U R U R' U' R' U' R' U R'", set: 'pll', group: 'Edges only', twoLook: true },
  { id: 'pll-h', name: 'H', alg: "M2 U M2 U2 M2 U M2", set: 'pll', group: 'Edges only', twoLook: true },
  { id: 'pll-z', name: 'Z', alg: "M' U M2 U M2 U M' U2 M2", set: 'pll', group: 'Edges only', twoLook: true },
  { id: 'pll-aa', name: 'Aa', alg: "x R' U R' D2 R U' R' D2 R2 x'", set: 'pll', group: 'Corners only' },
  { id: 'pll-ab', name: 'Ab', alg: "x R2 D2 R U R' D2 R U' R x'", set: 'pll', group: 'Corners only' },
  { id: 'pll-e', name: 'E', alg: "x' R U' R' D R U R' D' R U R' D R U' R' D' x", set: 'pll', group: 'Corners only' },
  { id: 'pll-t', name: 'T', alg: "R U R' U' R' F R2 U' R' U' R U R' F'", set: 'pll', group: 'Adjacent swap', twoLook: true },
  { id: 'pll-f', name: 'F', alg: "R' U' F' R U R' U' R' F R2 U' R' U' R U R' U R", set: 'pll', group: 'Adjacent swap' },
  { id: 'pll-ja', name: 'Ja', alg: "x R2 F R F' R U2 r' U r U2 x'", set: 'pll', group: 'Adjacent swap' },
  { id: 'pll-jb', name: 'Jb', alg: "R U R' F' R U R' U' R' F R2 U' R'", set: 'pll', group: 'Adjacent swap' },
  { id: 'pll-ra', name: 'Ra', alg: "R U' R' U' R U R D R' U' R D' R' U2 R'", set: 'pll', group: 'Adjacent swap' },
  { id: 'pll-rb', name: 'Rb', alg: "R2 F R U R U' R' F' R U2 R' U2 R", set: 'pll', group: 'Adjacent swap' },
  { id: 'pll-ga', name: 'Ga', alg: "R2 U R' U R' U' R U' R2 U' D R' U R D'", set: 'pll', group: 'G perms' },
  { id: 'pll-gb', name: 'Gb', alg: "R' U' R U D' R2 U R' U R U' R U' R2 D", set: 'pll', group: 'G perms' },
  { id: 'pll-gc', name: 'Gc', alg: "R2 U' R U' R U R' U R2 U D' R U' R' D", set: 'pll', group: 'G perms' },
  { id: 'pll-gd', name: 'Gd', alg: "R U R' U' D R2 U' R U' R' U R' U R2 D'", set: 'pll', group: 'G perms' },
  { id: 'pll-y', name: 'Y', alg: "F R U' R' U' R U R' F' R U R' U' R' F R F'", set: 'pll', group: 'Diagonal swap', twoLook: true },
  { id: 'pll-v', name: 'V', alg: "R' U R' U' y R' F' R2 U' R' U R' F R F y'", set: 'pll', group: 'Diagonal swap' },
  { id: 'pll-na', name: 'Na', alg: "R U R' U R U R' F' R U R' U' R' F R2 U' R' U2 R U' R'", set: 'pll', group: 'Diagonal swap' },
  { id: 'pll-nb', name: 'Nb', alg: "R' U R U' R' F' U' F R U R' F R' F' R U' R", set: 'pll', group: 'Diagonal swap' },
];

export interface Pattern { id: string; name: string; alg: string; vibe: string; level: 'easy' | 'medium' | 'hard' }
export const PATTERNS: Pattern[] = [
  { id: 'checker', name: 'Checkerboard', alg: "R2 L2 U2 D2 F2 B2", vibe: 'The classic. Six half turns.', level: 'easy' },
  { id: 'dots', name: 'Six Spots', alg: "U D' R L' F B' U D'", vibe: 'Every centre gets a polka dot.', level: 'easy' },
  { id: 'tetris', name: 'Tetris', alg: "L R F B U' D' L' R'", vibe: 'Blocky stripes on every side.', level: 'easy' },
  { id: 'fourspots', name: 'Four Spots', alg: "F2 B2 U D' R2 L2 U D'", vibe: 'Spots on four sides, plain top and bottom.', level: 'easy' },
  { id: 'wire', name: 'Wire', alg: "R L F B R L F B R L F B R2 B2 L2 R2 B2 L2", vibe: 'A thin wire wraps the cube.', level: 'medium' },
  { id: 'plus', name: 'Plus Minus', alg: "U F B' L2 U2 L2 F' B U2 L2 U", vibe: 'Plus signs and minus signs.', level: 'medium' },
  { id: 'cubeincube', name: 'Cube in a Cube', alg: "F L F U' R U F2 L2 U' L' B D' B' L2 U", vibe: 'A little cube sits inside the big one.', level: 'hard' },
  { id: 'superflip', name: 'Superflip', alg: "U R2 F B R B2 R U2 L B2 R U' D' R2 F R' L B2 U2 F2", vibe: 'Every edge flipped. The famous “hardest” position.', level: 'hard' },
];

export const ALL_ALGS = [...OLL_EDGES, ...OLL_CORNERS, ...PLL];
export const findAlg = (id: string) => ALL_ALGS.find((a) => a.id === id);
