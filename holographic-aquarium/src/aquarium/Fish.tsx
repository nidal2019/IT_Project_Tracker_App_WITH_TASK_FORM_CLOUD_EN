import {useMemo} from "react";
import type {FishPath} from "./paths";
import {DISCUS_PATHS, MANDARIN_PATH, TETRA_PATHS} from "./paths";
import {
  MANDARIN_LENGTH,
  TETRA_LENGTH,
  discusBody,
  discusFin,
  mandarinBody,
  mandarinDorsal,
  mandarinPectoral,
  tetraAnal,
  tetraBody,
  tetraDorsal,
  tetraTail,
} from "./geometry";
import {createEyeMaterial, createFishMaterial} from "./materials";
import {SwimGroup} from "./SwimGroup";
import {useLoopTime} from "./time";

type NeonTetraProps = {
  readonly path: FishPath;
};

/** One neon tetra: silver body, electric-blue stripe, red lower stripe. */
export const NeonTetra = ({path}: NeonTetraProps) => {
  const body = useMemo(
    () =>
      createFishMaterial({
        pattern: 0,
        phase: path.phase,
        wag: 8,
        amp: 0.028,
        half: TETRA_LENGTH / 2,
        gloss: 0.82,
        glow: 0.9,
        fin: 0,
        tint: path.tint,
      }),
    [path],
  );
  const fins = useMemo(
    () =>
      createFishMaterial({
        pattern: 1,
        phase: path.phase,
        wag: 8,
        amp: 0.07,
        half: 0.16,
        gloss: 0.7,
        glow: 0.65,
        fin: 1,
        tint: path.tint,
        transparent: true,
      }),
    [path],
  );
  const eye = useMemo(
    () => createEyeMaterial([0.25, 0.82, 1], 1, path.tint),
    [path.tint],
  );
  return (
    <SwimGroup path={path}>
      <mesh geometry={tetraBody} material={body} renderOrder={0} />
      <mesh
        geometry={tetraTail}
        material={fins}
        position={[-TETRA_LENGTH / 2 + 0.01, 0, 0]}
        rotation={[0, 0, Math.PI]}
        renderOrder={1}
      />
      <mesh
        geometry={tetraDorsal}
        material={fins}
        position={[0.01, 0.1, 0]}
        rotation={[0, 0, Math.PI / 2]}
        renderOrder={1}
      />
      <mesh
        geometry={tetraAnal}
        material={fins}
        position={[-0.04, -0.09, 0]}
        rotation={[0, 0, -Math.PI / 2]}
        renderOrder={1}
      />
      <mesh position={[0.11, 0.03, 0.052]} material={eye}>
        <sphereGeometry args={[0.028, 20, 16]} />
      </mesh>
      <mesh position={[0.11, 0.03, -0.052]} rotation={[0, Math.PI, 0]} material={eye}>
        <sphereGeometry args={[0.028, 20, 16]} />
      </mesh>
    </SwimGroup>
  );
};

type DiscusProps = {
  readonly path: FishPath;
};

/** Round discus with turquoise and orange bars. */
export const Discus = ({path}: DiscusProps) => {
  const body = useMemo(
    () =>
      createFishMaterial({
        pattern: 2,
        phase: path.phase,
        wag: 2,
        amp: 0.01,
        half: 0.34,
        gloss: 0.74,
        glow: 0.85,
        fin: 0,
        tint: path.tint,
      }),
    [path],
  );
  const fin = useMemo(
    () =>
      createFishMaterial({
        pattern: 3,
        phase: path.phase,
        wag: 2,
        amp: 0.02,
        half: 0.2,
        gloss: 0.6,
        glow: 0.55,
        fin: 1,
        tint: path.tint,
        transparent: true,
      }),
    [path],
  );
  const eye = useMemo(
    () => createEyeMaterial([1, 0.34, 0.06], 0, path.tint),
    [path.tint],
  );
  return (
    <SwimGroup path={path}>
      <mesh geometry={discusFin} material={fin} renderOrder={1} />
      <mesh geometry={discusBody} material={body} renderOrder={0} />
      <mesh position={[0.16, 0.045, 0.09]} material={eye}>
        <sphereGeometry args={[0.046, 24, 18]} />
      </mesh>
      <mesh position={[0.16, 0.045, -0.09]} rotation={[0, Math.PI, 0]} material={eye}>
        <sphereGeometry args={[0.046, 24, 18]} />
      </mesh>
    </SwimGroup>
  );
};

/** Mandarin dragonet with maze-like blue lines over orange. */
export const Mandarin = () => {
  const path = MANDARIN_PATH;
  const time = useLoopTime();
  const flap = Math.sin((time * 8 + path.phase) * Math.PI * 2) * 0.2;
  const body = useMemo(
    () =>
      createFishMaterial({
        pattern: 4,
        phase: path.phase,
        wag: 4,
        amp: 0.014,
        half: MANDARIN_LENGTH / 2,
        gloss: 0.88,
        glow: 1.05,
        fin: 0,
        tint: path.tint,
      }),
    [path],
  );
  const fin = useMemo(
    () =>
      createFishMaterial({
        pattern: 5,
        phase: path.phase,
        wag: 8,
        amp: 0.04,
        half: 0.2,
        gloss: 0.8,
        glow: 0.8,
        fin: 1,
        tint: path.tint,
        transparent: true,
      }),
    [path],
  );
  const eye = useMemo(
    () => createEyeMaterial([1, 0.45, 0.05], 0, path.tint),
    [path],
  );
  return (
    <SwimGroup path={path}>
      <mesh geometry={mandarinBody} material={body} />
      <mesh
        geometry={mandarinPectoral}
        material={fin}
        position={[0.05, 0.015, 0.075]}
        rotation={[flap, 0.35, Math.PI / 2]}
        renderOrder={1}
      />
      <mesh
        geometry={mandarinPectoral}
        material={fin}
        position={[0.05, 0.015, -0.075]}
        rotation={[-flap, -0.35, -Math.PI / 2]}
        renderOrder={1}
      />
      <mesh
        geometry={mandarinDorsal}
        material={fin}
        position={[-0.02, 0.09, 0]}
        rotation={[0, 0, Math.PI / 2]}
        renderOrder={1}
      />
      <mesh position={[0.15, 0.028, 0.072]} material={eye}>
        <sphereGeometry args={[0.022, 18, 14]} />
      </mesh>
      <mesh
        position={[0.15, 0.028, -0.072]}
        rotation={[0, Math.PI, 0]}
        material={eye}
      >
        <sphereGeometry args={[0.022, 18, 14]} />
      </mesh>
    </SwimGroup>
  );
};

/** Central school: tetras behind two discus and one mandarin. */
export const School = () => {
  return (
    <>
      {TETRA_PATHS.map((path) => (
        <NeonTetra key={path.phase} path={path} />
      ))}
      {DISCUS_PATHS.map((path) => (
        <Discus key={path.phase} path={path} />
      ))}
      <Mandarin />
    </>
  );
};
