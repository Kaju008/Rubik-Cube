// Human words for every move, from the solver's point of view (cube held in front of you).
export interface MoveWords { short: string; long: string; speak: string }

const FACE_NAME: Record<string, string> = {
  R: 'Right side', L: 'Left side', U: 'Top', D: 'Bottom', F: 'Front', B: 'Back',
};

const DIR: Record<string, [string, string]> = {
  // [clockwise words, counter-clockwise words] as seen by someone holding the cube
  R: ['up', 'down'],
  L: ['down', 'up'],
  U: ['to the left', 'to the right'],
  D: ['to the right', 'to the left'],
  F: ['clockwise', 'counter-clockwise'],
  B: ['top row to the left', 'top row to the right'],
};

const spokenNotation = (m: string) => {
  const f = m[0];
  if (m.endsWith('2')) return `${f} two`;
  if (m.endsWith("'")) return `${f} prime`;
  return f;
};

export function describeMove(m: string): MoveWords {
  const f = m[0];
  if (f === 'y' || f === 'x' || f === 'z') {
    const words =
      m === 'y' ? 'Turn the whole cube so the right side faces you'
      : m === "y'" ? 'Turn the whole cube so the left side faces you'
      : m === 'y2' ? 'Turn the whole cube around, back to front'
      : m === 'x' ? 'Tip the whole cube forward-up: front goes to the top'
      : m === "x'" ? 'Tip the whole cube: top comes to the front'
      : m === 'x2' ? 'Flip the whole cube upside-down'
      : m === 'z' ? 'Roll the whole cube clockwise'
      : m === "z'" ? 'Roll the whole cube counter-clockwise'
      : 'Roll the whole cube upside-down';
    return { short: 'Rotate cube', long: words, speak: words + '. Keep white on the bottom.' };
  }
  const name = FACE_NAME[f];
  if (m.endsWith('2')) {
    const long = `${name}: turn it twice (half turn)`;
    return { short: `${name} ×2`, long, speak: `${spokenNotation(m)}. ${name}, twice.` };
  }
  const [cw, ccw] = DIR[f];
  const dir = m.endsWith("'") ? ccw : cw;
  const long = `${name} ${dir}`;
  return { short: long, long, speak: `${spokenNotation(m)}. ${long}.` };
}
