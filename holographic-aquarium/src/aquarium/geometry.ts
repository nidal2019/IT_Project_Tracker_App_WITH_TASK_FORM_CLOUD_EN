import * as THREE from "three";

type ProfilePoint = {
  readonly t: number;
  readonly halfY: number;
  readonly halfZ: number;
};

const smooth = (u: number): number => u * u * (3 - 2 * u);

const sampleProfile = (
  points: readonly ProfilePoint[],
  t: number,
): {halfY: number; halfZ: number} => {
  const clamped = Math.min(Math.max(t, 0), 1);
  let index = 0;
  while (index < points.length - 2 && points[index + 1].t < clamped) {
    index += 1;
  }
  const a = points[index];
  const b = points[index + 1];
  const span = Math.max(b.t - a.t, 1e-5);
  const s = smooth((clamped - a.t) / span);
  return {
    halfY: a.halfY + (b.halfY - a.halfY) * s,
    halfZ: a.halfZ + (b.halfZ - a.halfZ) * s,
  };
};

const flipWinding = (geo: THREE.BufferGeometry): void => {
  const index = geo.getIndex();
  if (!index) {
    return;
  }
  for (let i = 0; i < index.count; i += 3) {
    const first = index.getX(i);
    index.setX(i, index.getX(i + 1));
    index.setX(i + 1, first);
  }
};

/** Turn the highest vertex's normal upward. Flat fins should not use this. */
const orientBodyNormals = (geo: THREE.BufferGeometry): THREE.BufferGeometry => {
  geo.computeVertexNormals();
  const position = geo.getAttribute("position");
  const normal = geo.getAttribute("normal");
  let maxY = -Infinity;
  let top = 0;
  for (let i = 0; i < position.count; i++) {
    const y = position.getY(i);
    if (y > maxY) {
      maxY = y;
      top = i;
    }
  }
  if (normal.getY(top) < 0) {
    flipWinding(geo);
    geo.computeVertexNormals();
  }
  return geo;
};

type BodyOptions = {
  readonly length: number;
  readonly points: readonly ProfilePoint[];
  readonly rings: number;
  readonly radial: number;
  /** Scales the +Z half so a belly can sit flatter against the glass. */
  readonly bellyFlatten: number;
};

/** Fusiform body. +X is the head, +Y is up, +Z is the fish's right. */
export const createBodyGeometry = ({
  length,
  points,
  rings,
  radial,
  bellyFlatten,
}: BodyOptions): THREE.BufferGeometry => {
  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];
  const row = radial + 1;

  for (let i = 0; i <= rings; i++) {
    const t = i / rings;
    const profile = sampleProfile(points, t);
    const x = (0.5 - t) * length;
    for (let j = 0; j <= radial; j++) {
      const angle = (j / radial) * Math.PI * 2;
      const y = Math.cos(angle) * profile.halfY;
      let z = Math.sin(angle) * profile.halfZ;
      if (z > 0) {
        z *= bellyFlatten;
      }
      positions.push(x, y, z);
      uvs.push(t, j / radial);
    }
  }

  for (let i = 0; i < rings; i++) {
    for (let j = 0; j < radial; j++) {
      const a = i * row + j;
      const b = a + 1;
      const c = a + row;
      const d = c + 1;
      indices.push(a, c, b, b, c, d);
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  return orientBodyNormals(geo);
};

type FinOptions = {
  readonly length: number;
  readonly spread: number;
  readonly rays: number;
  readonly segments: number;
  readonly shape: "fan" | "round" | "fork";
};

/** Fin in the local XY plane. uv.x runs base to tip, uv.y runs across the fin. */
export const createFinGeometry = ({
  length,
  spread,
  rays,
  segments,
  shape,
}: FinOptions): THREE.BufferGeometry => {
  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];
  const columns = rays + 1;

  for (let i = 0; i <= segments; i++) {
    const u = i / segments;
    for (let j = 0; j <= rays; j++) {
      const v = j / rays;
      const angle = (v - 0.5) * spread;
      const across = Math.abs(v - 0.5) * 2;
      const round = Math.sin(v * Math.PI);
      let reach = length;
      if (shape === "round") {
        reach = length * (0.28 + 0.72 * Math.pow(round, 0.55));
      } else if (shape === "fork") {
        reach = length * (0.42 + 0.58 * Math.pow(across, 0.7));
      } else {
        reach = length * (1 - v * 0.22);
      }
      const radius = u * reach;
      const cup = Math.sin(u * Math.PI) * Math.sin(v * Math.PI) * length * 0.04;
      positions.push(Math.cos(angle) * radius, Math.sin(angle) * radius, cup);
      uvs.push(u, v);
    }
  }

  for (let i = 0; i < segments; i++) {
    for (let j = 0; j < rays; j++) {
      const a = i * columns + j;
      const b = a + 1;
      const c = a + columns;
      const d = c + 1;
      indices.push(a, c, b, b, c, d);
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
};

/** Annulus in the XY plane for a discus skirt. uv.x is radial, uv.y is angle. */
export const createAnnulusGeometry = (
  inner: number,
  outer: number,
  segments: number,
): THREE.BufferGeometry => {
  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];

  for (let i = 0; i <= segments; i++) {
    const angle = (i / segments) * Math.PI * 2;
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    const bowl = 0.012;
    positions.push(cos * inner, sin * inner, 0, cos * outer, sin * outer, bowl);
    uvs.push(0, i / segments, 1, i / segments);
  }

  for (let i = 0; i < segments; i++) {
    const a = i * 2;
    indices.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
};

const TETRA_PROFILE: readonly ProfilePoint[] = [
  {t: 0, halfY: 0.012, halfZ: 0.01},
  {t: 0.08, halfY: 0.07, halfZ: 0.04},
  {t: 0.2, halfY: 0.13, halfZ: 0.05},
  {t: 0.42, halfY: 0.155, halfZ: 0.046},
  {t: 0.66, halfY: 0.1, halfZ: 0.03},
  {t: 0.84, halfY: 0.04, halfZ: 0.016},
  {t: 1, halfY: 0.012, halfZ: 0.008},
];

const MANDARIN_PROFILE: readonly ProfilePoint[] = [
  {t: 0, halfY: 0.03, halfZ: 0.032},
  {t: 0.12, halfY: 0.09, halfZ: 0.08},
  {t: 0.34, halfY: 0.1, halfZ: 0.086},
  {t: 0.58, halfY: 0.078, halfZ: 0.066},
  {t: 0.82, halfY: 0.04, halfZ: 0.03},
  {t: 1, halfY: 0.014, halfZ: 0.012},
];

const PLECO_PROFILE: readonly ProfilePoint[] = [
  {t: 0, halfY: 0.07, halfZ: 0.04},
  {t: 0.08, halfY: 0.2, halfZ: 0.055},
  {t: 0.2, halfY: 0.23, halfZ: 0.062},
  {t: 0.4, halfY: 0.17, halfZ: 0.05},
  {t: 0.68, halfY: 0.11, halfZ: 0.038},
  {t: 0.88, halfY: 0.055, halfZ: 0.024},
  {t: 1, halfY: 0.02, halfZ: 0.014},
];

/** Neon tetra body length. Half-extent is used by the swim shader. */
export const TETRA_LENGTH = 0.46;

/** Mandarin dragonet body length. */
export const MANDARIN_LENGTH = 0.52;

/** Plecostomus body length, sized for the foreground macro. */
export const PLECO_LENGTH = 0.96;

export const tetraBody = createBodyGeometry({
  length: TETRA_LENGTH,
  points: TETRA_PROFILE,
  rings: 36,
  radial: 20,
  bellyFlatten: 1,
});

export const tetraTail = createFinGeometry({
  length: 0.16,
  spread: 1.15,
  rays: 14,
  segments: 8,
  shape: "fork",
});

export const tetraDorsal = createFinGeometry({
  length: 0.09,
  spread: 0.7,
  rays: 8,
  segments: 6,
  shape: "fan",
});

export const tetraAnal = createFinGeometry({
  length: 0.1,
  spread: 0.62,
  rays: 8,
  segments: 6,
  shape: "fan",
});

export const discusBody = (() => {
  const geo = new THREE.SphereGeometry(0.34, 72, 56);
  const position = geo.getAttribute("position");
  for (let i = 0; i < position.count; i++) {
    const x = position.getX(i);
    const y = position.getY(i);
    const z = position.getZ(i);
    const radial = Math.min(Math.sqrt(x * x + y * y) / 0.34, 1);
    const thin = 0.2 + (1 - radial) * 0.18;
    position.setXYZ(i, x * 1.02, y * 1.05, z * thin);
  }
  geo.computeVertexNormals();
  return geo;
})();

export const discusFin = createAnnulusGeometry(0.31, 0.43, 72);

export const mandarinBody = createBodyGeometry({
  length: MANDARIN_LENGTH,
  points: MANDARIN_PROFILE,
  rings: 32,
  radial: 20,
  bellyFlatten: 1,
});

export const mandarinPectoral = createFinGeometry({
  length: 0.2,
  spread: 1.7,
  rays: 16,
  segments: 8,
  shape: "round",
});

export const mandarinDorsal = createFinGeometry({
  length: 0.14,
  spread: 0.85,
  rays: 10,
  segments: 6,
  shape: "fan",
});

export const plecoBody = createBodyGeometry({
  length: PLECO_LENGTH,
  points: PLECO_PROFILE,
  rings: 42,
  radial: 28,
  bellyFlatten: 0.58,
});

export const plecoPectoral = createFinGeometry({
  length: 0.34,
  spread: 1.05,
  rays: 16,
  segments: 10,
  shape: "fan",
});

export const plecoPelvic = createFinGeometry({
  length: 0.2,
  spread: 0.85,
  rays: 12,
  segments: 8,
  shape: "fan",
});

export const plecoTail = createFinGeometry({
  length: 0.2,
  spread: 1.25,
  rays: 14,
  segments: 8,
  shape: "round",
});

export const plecoSucker = new THREE.CircleGeometry(0.1, 64);
export const plecoLip = new THREE.TorusGeometry(0.098, 0.013, 16, 56);

export const HOLO_HALF = {x: 1.02, y: 0.72, z: 0.58} as const;

export const holoBox = new THREE.BoxGeometry(
  HOLO_HALF.x * 2,
  HOLO_HALF.y * 2,
  HOLO_HALF.z * 2,
);

export const glassPlane = new THREE.PlaneGeometry(3.4, 3.1, 1, 1);
