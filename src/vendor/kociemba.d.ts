declare const Cube: {
  new (): { asString(): string; move(alg: string): void; solve(): string };
  initSolver(): void;
  random(): { solve(): string };
  fromString(s: string): { solve(): string; asString(): string };
};
export default Cube;
