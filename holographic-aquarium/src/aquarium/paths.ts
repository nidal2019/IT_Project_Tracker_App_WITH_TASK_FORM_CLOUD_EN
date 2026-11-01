import * as THREE from "three";

/** Closed swimming path. Every frequency is an integer so the loop has no seam. */
export type FishPath = {
  readonly cx: number;
  readonly cy: number;
  readonly cz: number;
  readonly rx: number;
  readonly ry: number;
  readonly rz: number;
  readonly phase: number;
  readonly cycles: number;
  readonly bob: number;
  readonly scale: number;
  readonly zCycles: number;
  readonly tint: readonly [number, number, number];
};

export type Pose = {
  readonly x: number;
  readonly y: number;
  readonly z: number;
  readonly qx: number;
  readonly qy: number;
  readonly qz: number;
  readonly qw: number;
};

const TAU = Math.PI * 2;
const forward = new THREE.Vector3();
const up = new THREE.Vector3();
const side = new THREE.Vector3();
const yAxis = new THREE.Vector3();
const worldUp = new THREE.Vector3(0, 1, 0);
const basis = new THREE.Matrix4();
const quat = new THREE.Quaternion();

/**
 * Position and orientation of a fish at loop time `t` (0–1).
 * Local +X points along travel, local +Y is up, local +Z is lateral.
 */
export const poseOnPath = (path: FishPath, t: number): Pose => {
  const a = (t * path.cycles + path.phase) * TAU;
  const phase = path.phase * TAU;
  const bob =
    Math.sin(a * 2 + phase) * path.bob + Math.sin(a * 3 + phase * 0.5) * path.bob * 0.35;
  const x =
    path.cx +
    Math.cos(a) * path.rx +
    Math.sin(a * 2 + phase) * path.rx * 0.16;
  const y = path.cy + Math.sin(a) * path.ry + bob;
  const z = path.cz + Math.sin(a * path.zCycles + phase) * path.rz;

  const dx =
    -Math.sin(a) * path.rx * path.cycles +
    Math.cos(a * 2 + phase) * path.rx * 0.16 * 2 * path.cycles;
  const dy =
    Math.cos(a) * path.ry * path.cycles +
    Math.cos(a * 2 + phase) * path.bob * 2 * path.cycles +
    Math.cos(a * 3 + phase * 0.5) * path.bob * 0.35 * 3 * path.cycles;
  const dz =
    Math.cos(a * path.zCycles + phase) * path.rz * path.zCycles * path.cycles;

  forward.set(dx, dy, dz);
  if (forward.lengthSq() < 1e-8) {
    forward.set(1, 0, 0);
  } else {
    forward.normalize();
  }

  side.crossVectors(forward, worldUp);
  if (side.lengthSq() < 1e-6) {
    side.set(0, 0, 1);
  }
  side.normalize();
  const bank = THREE.MathUtils.clamp(-dx * 0.22, -0.38, 0.38);
  up.copy(worldUp).applyAxisAngle(forward, bank);
  side.crossVectors(forward, up).normalize();
  yAxis.crossVectors(side, forward).normalize();
  basis.makeBasis(forward, yAxis, side);
  quat.setFromRotationMatrix(basis);

  return {
    x,
    y,
    z,
    qx: quat.x,
    qy: quat.y,
    qz: quat.z,
    qw: quat.w,
  };
};

/** Foreground pleco stays on the glass and eases back and forth. */
export const PLECO = {
  cx: 0,
  cy: -0.56,
  rx: 0.18,
  ry: 0.04,
  sway: 0.2,
  mouthForward: 0.3,
  z: 2.55,
} as const;

/** Glass plane sitting just behind the pleco, in front of the school. */
export const GLASS_Z = 2.5;

export const CAMERA = {
  fov: 27,
  y: 0.02,
  z: 8.05,
  lookX: 0,
  lookY: 0.16,
  lookZ: 0.35,
  push: 0.16,
} as const;

export type PlecoPose = {
  readonly x: number;
  readonly y: number;
  readonly yaw: number;
};

/** Belly toward the camera, head mostly up, slow lateral cleaning glide. */
export const plecoPose = (t: number): PlecoPose => {
  const a = t * TAU;
  return {
    x: PLECO.cx + Math.sin(a) * PLECO.rx,
    y: PLECO.cy + Math.sin(a) * Math.cos(a) * PLECO.ry,
    yaw: Math.PI / 2 + Math.sin(a) * PLECO.sway,
  };
};

const tetra = (
  path: Omit<FishPath, "cycles" | "zCycles" | "tint"> & {
    readonly tint?: FishPath["tint"];
  },
): FishPath => {
  const {tint, ...rest} = path;
  return {
    ...rest,
    cycles: 1,
    zCycles: 1,
    tint: tint ?? [0.85, 1, 1.05],
  };
};

/** Loose school inside the holographic volume. One orbit each, different phase. */
export const TETRA_PATHS: readonly FishPath[] = [
  tetra({cx: -0.02, cy: 0.78, cz: -0.08, rx: 0.58, ry: 0.16, rz: 0.2, phase: 0.02, bob: 0.035, scale: 1}),
  tetra({cx: 0.16, cy: 0.52, cz: 0.12, rx: 0.42, ry: 0.12, rz: 0.14, phase: 0.17, bob: 0.028, scale: 0.92, tint: [0.8, 1, 1.1]}),
  tetra({cx: -0.22, cy: 0.58, cz: -0.22, rx: 0.5, ry: 0.14, rz: 0.18, phase: 0.33, bob: 0.032, scale: 1.06, tint: [0.9, 0.98, 1.08]}),
  tetra({cx: 0.24, cy: 0.92, cz: -0.12, rx: 0.34, ry: 0.1, rz: 0.12, phase: 0.51, bob: 0.022, scale: 0.86}),
  tetra({cx: -0.3, cy: 0.36, cz: 0.08, rx: 0.32, ry: 0.09, rz: 0.11, phase: 0.68, bob: 0.026, scale: 0.96, tint: [0.78, 1.02, 1.12]}),
  tetra({cx: 0.04, cy: 0.66, cz: 0.2, rx: 0.46, ry: 0.13, rz: 0.1, phase: 0.12, bob: 0.03, scale: 1.08}),
  tetra({cx: -0.06, cy: 1.02, cz: 0.02, rx: 0.28, ry: 0.08, rz: 0.16, phase: 0.81, bob: 0.02, scale: 0.82, tint: [0.95, 1, 1]}),
  tetra({cx: 0.32, cy: 0.4, cz: -0.02, rx: 0.26, ry: 0.08, rz: 0.13, phase: 0.44, bob: 0.024, scale: 0.9}),
];

export const DISCUS_PATHS: readonly FishPath[] = [
  {
    cx: -0.38,
    cy: 0.12,
    cz: 0.02,
    rx: 0.2,
    ry: 0.07,
    rz: 0.1,
    phase: 0.22,
    cycles: 1,
    bob: 0.02,
    scale: 1,
    zCycles: 1,
    tint: [0.75, 1.05, 1],
  },
  {
    cx: 0.42,
    cy: 0.22,
    cz: -0.08,
    rx: 0.16,
    ry: 0.06,
    rz: 0.11,
    phase: 0.63,
    cycles: 1,
    bob: 0.018,
    scale: 0.94,
    zCycles: 1,
    tint: [1.05, 0.92, 0.85],
  },
];

export const MANDARIN_PATH: FishPath = {
  cx: 0.02,
  cy: 0.18,
  cz: 0.28,
  rx: 0.14,
  ry: 0.045,
  rz: 0.06,
  phase: 0.4,
  cycles: 1,
  bob: 0.028,
  scale: 1.45,
  zCycles: 2,
  tint: [1, 0.96, 0.9],
};
