// Three.js cube that mirrors the user's real colours and animates every move.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { FACELETS, State, applyMoves, moveGeometry } from '../cube/model';

const AXES = ['x', 'y', 'z'] as const;
const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);
const DEG = Math.PI / 180;

function roundedSquare(size: number, r: number) {
  const h = size / 2;
  const s = new THREE.Shape();
  s.moveTo(-h + r, -h);
  s.lineTo(h - r, -h); s.quadraticCurveTo(h, -h, h, -h + r);
  s.lineTo(h, h - r); s.quadraticCurveTo(h, h, h - r, h);
  s.lineTo(-h + r, h); s.quadraticCurveTo(-h, h, -h, h - r);
  s.lineTo(-h, -h + r); s.quadraticCurveTo(-h, -h, -h + r, -h);
  return new THREE.ShapeGeometry(s, 6);
}

interface Anim { pivot: THREE.Group; axis: number; target: number; start: number; dur: number; move: string; commit: boolean; done: () => void }
export interface ViewOptions { onTap?: () => void; autoSpin?: boolean; interactive?: boolean; peek?: boolean }

export class CubeView {
  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera = new THREE.PerspectiveCamera(32, 1, 0.1, 100);
  private root = new THREE.Group();
  private cubies: THREE.Group[] = [];
  private stickers: THREE.Mesh[] = [];
  private mats = new Map<string, THREE.MeshStandardMaterial>();
  private state: State;
  private colors: string[];
  private anim: Anim | null = null;
  private loopMove: string | null = null;
  private loopNext = 0;
  private arrow: THREE.Group | null = null;
  private raf = 0;
  private ro: ResizeObserver;
  private yaw = 34 * DEG; private pitch = 26 * DEG;
  private targetYaw = 34 * DEG; private targetPitch = 26 * DEG;
  private dragYaw = 0; private dragPitch = 0; private dragging = false; private lastDrag = 0;
  private spin = 0;
  private dist = 9;
  private disposed = false;

  constructor(private el: HTMLElement, state: State, colors: string[], private opts: ViewOptions = {}) {
    this.state = state.slice();
    this.colors = colors;
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    el.appendChild(this.renderer.domElement);
    this.renderer.domElement.style.touchAction = 'none';

    this.scene.add(new THREE.AmbientLight(0xffffff, 1.6));
    const key = new THREE.DirectionalLight(0xffffff, 1.6); key.position.set(4, 8, 6); this.scene.add(key);
    const rim = new THREE.DirectionalLight(0xff7ad9, 0.6); rim.position.set(-6, -2, -4); this.scene.add(rim);
    this.scene.add(this.root);
    this.build();
    this.paint();

    this.ro = new ResizeObserver(() => this.resize());
    this.ro.observe(el);
    this.resize();
    if (opts.interactive !== false) this.bindPointer();
    this.raf = requestAnimationFrame(this.tick);
  }

  private mat(hex: string) {
    let m = this.mats.get(hex);
    if (!m) { m = new THREE.MeshStandardMaterial({ color: hex, roughness: 0.35, metalness: 0.0 }); this.mats.set(hex, m); }
    return m;
  }

  private build() {
    const body = new RoundedBoxGeometry(0.97, 0.97, 0.97, 3, 0.11);
    const bodyMat = new THREE.MeshStandardMaterial({ color: 0x14141c, roughness: 0.5 });
    const stickerGeo = roundedSquare(0.8, 0.13);
    const byPos = new Map<string, THREE.Group>();
    for (let x = -1; x <= 1; x++) for (let y = -1; y <= 1; y++) for (let z = -1; z <= 1; z++) {
      if (!x && !y && !z) continue;
      const g = new THREE.Group();
      g.userData.home = new THREE.Vector3(x, y, z);
      g.position.set(x, y, z);
      g.add(new THREE.Mesh(body, bodyMat));
      this.root.add(g);
      this.cubies.push(g);
      byPos.set(`${x},${y},${z}`, g);
    }
    for (const f of FACELETS) {
      const g = byPos.get(f.p.join(','))!;
      const m = new THREE.Mesh(stickerGeo, this.mat('#ffffff'));
      const n = new THREE.Vector3(...f.n);
      m.position.copy(n.clone().multiplyScalar(0.488));
      m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), n);
      g.add(m);
      this.stickers[f.idx] = m;
    }
  }

  private paint() {
    for (let i = 0; i < 54; i++) this.stickers[i].material = this.mat(this.colors[this.state[i]] ?? '#333');
  }

  setState(state: State, colors?: string[]) {
    this.cancelAnim();
    this.state = state.slice();
    if (colors) this.colors = colors;
    this.paint();
  }
  getState() { return this.state.slice(); }

  /** Loop a preview of the move (with a direction arrow) until another call. */
  showMove(move: string | null) {
    this.cancelAnim();
    this.loopMove = move;
    this.loopNext = performance.now() + 350;
    this.setArrow(move);
    this.setPeek(move);
  }

  /** Animate a move and keep the result. */
  commit(move: string, dur = 300): Promise<void> {
    this.loopMove = null;
    this.cancelAnim();
    this.setArrow(null);
    return new Promise((resolve) => this.startAnim(move, dur, true, resolve));
  }

  setSpin(on: boolean) { this.opts.autoSpin = on; }

  private setPeek(move: string | null) {
    if (!this.opts.peek) return;
    const f = move?.[0];
    this.targetYaw = (f === 'L' ? -38 : f === 'B' ? 118 : 34) * DEG;
    this.targetPitch = (f === 'D' ? -24 : 26) * DEG;
  }

  private startAnim(move: string, dur: number, commit: boolean, done: () => void = () => {}) {
    const { axis, layer, quarters } = moveGeometry(move);
    const pivot = new THREE.Group();
    this.root.add(pivot);
    for (const c of this.cubies) {
      const home = c.userData.home as THREE.Vector3;
      if (layer === 'all' || Math.round(home.getComponent(axis)) === layer) pivot.add(c);
    }
    this.anim = { pivot, axis, target: quarters * (Math.PI / 2), start: performance.now(), dur: Math.abs(quarters) === 2 ? dur * 1.5 : dur, move, commit, done };
  }

  private finishAnim() {
    const a = this.anim!;
    this.anim = null;
    for (const c of [...a.pivot.children] as THREE.Group[]) {
      this.root.add(c);
      c.position.copy(c.userData.home);
      c.rotation.set(0, 0, 0);
    }
    this.root.remove(a.pivot);
    if (a.commit) this.state = applyMoves(this.state, [a.move]);
    this.paint();
    a.done();
  }

  private cancelAnim() {
    if (!this.anim) return;
    const a = this.anim; // a committed move still lands (keeps state correct on fast taps)
    const done = a.done;
    a.done = () => {};
    this.finishAnim();
    done();
  }

  private setArrow(move: string | null) {
    if (this.arrow) { this.root.remove(this.arrow); this.arrow.traverse((o) => (o as THREE.Mesh).geometry?.dispose()); this.arrow = null; }
    if (!move) return;
    const { axis, layer, quarters } = moveGeometry(move);
    const R = layer === 'all' ? 2.35 : 1.08;
    const arc = Math.PI * 1.35;
    const mat = new THREE.MeshBasicMaterial({ color: 0xff4fd8, transparent: true, opacity: 0.95, depthTest: false });
    const g = new THREE.Group();
    const ring = new THREE.Mesh(new THREE.TorusGeometry(R, layer === 'all' ? 0.07 : 0.06, 10, 64, arc), mat);
    ring.renderOrder = 10;
    g.add(ring);
    const head = new THREE.Mesh(new THREE.ConeGeometry(0.17, 0.4, 16), mat);
    head.renderOrder = 10;
    head.position.set(R * Math.cos(arc), R * Math.sin(arc), 0);
    head.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), new THREE.Vector3(-Math.sin(arc), Math.cos(arc), 0));
    g.add(head);
    if (Math.abs(quarters) === 2) {
      const head2 = head.clone();
      const a2 = arc * 0.5;
      head2.position.set(R * Math.cos(a2), R * Math.sin(a2), 0);
      head2.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), new THREE.Vector3(-Math.sin(a2), Math.cos(a2), 0));
      g.add(head2);
    }
    const inner = new THREE.Group();
    inner.add(g);
    g.rotation.z = Math.PI * 0.32;
    const axisVec = new THREE.Vector3(axis === 0 ? 1 : 0, axis === 1 ? 1 : 0, axis === 2 ? 1 : 0);
    inner.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), axisVec.clone().multiplyScalar(Math.sign(quarters)));
    inner.position.copy(axisVec.multiplyScalar(layer === 'all' ? 0 : layer * 1.58));
    this.arrow = inner;
    this.root.add(inner);
  }

  private bindPointer() {
    const c = this.renderer.domElement;
    let sx = 0, sy = 0, lx = 0, ly = 0, moved = 0;
    c.addEventListener('pointerdown', (e) => { this.dragging = true; sx = lx = e.clientX; sy = ly = e.clientY; moved = 0; c.setPointerCapture(e.pointerId); });
    c.addEventListener('pointermove', (e) => {
      if (!this.dragging) return;
      const dx = e.clientX - lx, dy = e.clientY - ly; lx = e.clientX; ly = e.clientY;
      moved = Math.max(moved, Math.hypot(e.clientX - sx, e.clientY - sy));
      this.dragYaw -= dx * 0.008;
      this.dragPitch = Math.max(-1.2, Math.min(1.2, this.dragPitch + dy * 0.008));
      this.lastDrag = performance.now();
    });
    const up = () => {
      if (!this.dragging) return;
      this.dragging = false;
      if (moved < 7) this.opts.onTap?.();
    };
    c.addEventListener('pointerup', up);
    c.addEventListener('pointercancel', up);
  }

  private resize() {
    const w = this.el.clientWidth || 1, h = this.el.clientHeight || 1;
    this.renderer.setSize(w, h, false);
    this.renderer.domElement.style.width = '100%';
    this.renderer.domElement.style.height = '100%';
    this.camera.aspect = w / h;
    const r = this.arrow || this.opts.peek ? 2.9 : 2.6;
    const vf = (this.camera.fov / 2) * DEG;
    const hf = Math.atan(Math.tan(vf) * this.camera.aspect);
    this.dist = Math.max(r / Math.sin(vf), r / Math.sin(hf));
    this.camera.updateProjectionMatrix();
  }

  private tick = (now: number) => {
    if (this.disposed) return;
    this.raf = requestAnimationFrame(this.tick);
    if (this.anim) {
      const a = this.anim;
      const t = Math.min(1, (now - a.start) / a.dur);
      (a.pivot.rotation as unknown as Record<string, number>)[AXES[a.axis]] = a.target * ease(t);
      if (t >= 1) {
        if (a.commit) this.finishAnim();
        else if (now - a.start > a.dur + 650) { this.finishAnim(); this.loopNext = now + 380; }
      }
    } else if (this.loopMove && now >= this.loopNext) {
      this.startAnim(this.loopMove, 720, false);
    }
    if (!this.dragging && now - this.lastDrag > 1600) { this.dragYaw *= 0.92; this.dragPitch *= 0.92; }
    this.yaw += (this.targetYaw - this.yaw) * 0.08;
    this.pitch += (this.targetPitch - this.pitch) * 0.08;
    if (this.opts.autoSpin && !this.dragging) this.spin += 0.004;
    const yaw = this.yaw + this.dragYaw + this.spin, pitch = Math.max(-1.3, Math.min(1.3, this.pitch + this.dragPitch));
    this.camera.position.set(Math.sin(yaw) * Math.cos(pitch) * this.dist, Math.sin(pitch) * this.dist, Math.cos(yaw) * Math.cos(pitch) * this.dist);
    this.camera.lookAt(0, 0, 0);
    this.renderer.render(this.scene, this.camera);
  };

  dispose() {
    this.disposed = true;
    cancelAnimationFrame(this.raf);
    this.ro.disconnect();
    this.renderer.dispose();
    this.renderer.domElement.remove();
  }
}
