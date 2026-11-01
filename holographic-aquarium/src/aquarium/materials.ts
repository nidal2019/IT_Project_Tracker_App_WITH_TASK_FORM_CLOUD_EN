import * as THREE from "three";
import {
  eyeFragmentShader,
  eyeVertexShader,
  fishFragmentShader,
  fishVertexShader,
  glassFragmentShader,
  glassVertexShader,
  holoFragmentShader,
  holoVertexShader,
} from "./shaders";
import {PLECO} from "./paths";
import {HOLO_HALF} from "./geometry";
import {timeUniform} from "./time";

export type FishMaterialOptions = {
  readonly pattern: number;
  readonly phase: number;
  readonly wag: number;
  readonly amp: number;
  readonly half: number;
  readonly gloss: number;
  readonly glow: number;
  readonly fin: number;
  readonly tint: readonly [number, number, number];
  readonly transparent?: boolean;
};

/** Patterned fish or fin material. Shares the loop clock with every other fish. */
export const createFishMaterial = (
  options: FishMaterialOptions,
): THREE.ShaderMaterial => {
  return new THREE.ShaderMaterial({
    uniforms: {
      uTime: timeUniform,
      uPattern: {value: options.pattern},
      uPhase: {value: options.phase * Math.PI * 2},
      uWag: {value: options.wag},
      uAmp: {value: options.amp},
      uHalf: {value: options.half},
      uGloss: {value: options.gloss},
      uGlow: {value: options.glow},
      uFin: {value: options.fin},
      uTint: {value: new THREE.Vector3(...options.tint)},
    },
    vertexShader: fishVertexShader,
    fragmentShader: fishFragmentShader,
    transparent: options.transparent ?? false,
    depthWrite: !(options.transparent ?? false),
    side: options.transparent ? THREE.DoubleSide : THREE.FrontSide,
    toneMapped: false,
  });
};

/** Side-facing eye. The sphere's local +Z should point out of the head. */
export const createEyeMaterial = (
  iris: readonly [number, number, number],
  stripe: number,
  tint: readonly [number, number, number],
): THREE.ShaderMaterial => {
  return new THREE.ShaderMaterial({
    uniforms: {
      uIris: {value: new THREE.Vector3(...iris)},
      uStripe: {value: stripe},
      uTint: {value: new THREE.Vector3(...tint)},
    },
    vertexShader: eyeVertexShader,
    fragmentShader: eyeFragmentShader,
    toneMapped: false,
  });
};

/** Faint chromatic edges of the floating volume. Not a tank. */
export const createHoloMaterial = (): THREE.ShaderMaterial => {
  return new THREE.ShaderMaterial({
    uniforms: {
      uHalf: {value: new THREE.Vector3(HOLO_HALF.x, HOLO_HALF.y, HOLO_HALF.z)},
    },
    vertexShader: holoVertexShader,
    fragmentShader: holoFragmentShader,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
    toneMapped: false,
  });
};

/** Barely-there glass, algae film, and the pleco's looping clean trail. */
export const createGlassMaterial = (): THREE.ShaderMaterial => {
  return new THREE.ShaderMaterial({
    uniforms: {
      uTime: timeUniform,
      uCx: {value: PLECO.cx},
      uCy: {value: PLECO.cy},
      uRx: {value: PLECO.rx},
      uRy: {value: PLECO.ry},
      uSway: {value: PLECO.sway},
      uMouth: {value: PLECO.mouthForward},
    },
    vertexShader: glassVertexShader,
    fragmentShader: glassFragmentShader,
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    toneMapped: false,
  });
};
