import {useMemo} from "react";
import {
  PLECO_LENGTH,
  plecoBody,
  plecoLip,
  plecoPectoral,
  plecoPelvic,
  plecoSucker,
  plecoTail,
} from "./geometry";
import {createEyeMaterial, createFishMaterial} from "./materials";
import {PLECO, plecoPose} from "./paths";
import {useLoopTime} from "./time";

const PLECO_TINT = [1, 0.96, 0.9] as const;

/**
 * Ventral view of a pleco rasping the foreground glass.
 * Head stays mostly upright while the body eases through a closed glide.
 */
export const Plecostomus = () => {
  const time = useLoopTime();
  const pose = plecoPose(time);
  const curl = Math.sin(time * Math.PI * 2 * 2) * 0.045;

  const body = useMemo(
    () =>
      createFishMaterial({
        pattern: 6,
        phase: 0.15,
        wag: 2,
        amp: 0.006,
        half: PLECO_LENGTH / 2,
        gloss: 0.42,
        glow: 0.55,
        fin: 0,
        tint: PLECO_TINT,
      }),
    [],
  );
  const fins = useMemo(
    () =>
      createFishMaterial({
        pattern: 7,
        phase: 0.15,
        wag: 2,
        amp: 0.012,
        half: 0.34,
        gloss: 0.35,
        glow: 0.4,
        fin: 1,
        tint: PLECO_TINT,
        transparent: true,
      }),
    [],
  );
  const sucker = useMemo(
    () =>
      createFishMaterial({
        pattern: 8,
        phase: 0,
        wag: 1,
        amp: 0,
        half: 0.12,
        gloss: 0.3,
        glow: 0.35,
        fin: 0,
        tint: PLECO_TINT,
      }),
    [],
  );
  const eye = useMemo(
    () => createEyeMaterial([0.55, 0.32, 0.12], 0, PLECO_TINT),
    [],
  );
  return (
    <group position={[pose.x, pose.y, PLECO.z]} rotation={[0, 0, pose.yaw]} renderOrder={4}>
      <mesh geometry={plecoBody} material={body} renderOrder={4} />
      <mesh
        geometry={plecoPectoral}
        material={fins}
        position={[0.12, 0.16, 0.03]}
        rotation={[curl, 0, Math.PI / 2]}
        renderOrder={5}
      />
      <mesh
        geometry={plecoPectoral}
        material={fins}
        position={[0.12, -0.16, 0.03]}
        rotation={[curl, 0, -Math.PI / 2]}
        renderOrder={5}
      />
      <mesh
        geometry={plecoPelvic}
        material={fins}
        position={[-0.08, 0.08, 0.025]}
        rotation={[curl * 0.5, 0, Math.PI / 2 + 0.45]}
        renderOrder={5}
      />
      <mesh
        geometry={plecoPelvic}
        material={fins}
        position={[-0.08, -0.08, 0.025]}
        rotation={[curl * 0.5, 0, -Math.PI / 2 - 0.45]}
        renderOrder={5}
      />
      <mesh
        geometry={plecoTail}
        material={fins}
        position={[-PLECO_LENGTH / 2 + 0.02, 0, 0]}
        rotation={[0, 0, Math.PI]}
        renderOrder={5}
      />
      <mesh
        geometry={plecoSucker}
        material={sucker}
        position={[0.3, 0, 0.048]}
        renderOrder={6}
      />
      <mesh
        geometry={plecoLip}
        material={sucker}
        position={[0.3, 0, 0.05]}
        renderOrder={6}
      />
      <mesh position={[0.2, 0.19, 0.02]} material={eye} renderOrder={6}>
        <sphereGeometry args={[0.026, 18, 14]} />
      </mesh>
      <mesh position={[0.2, -0.19, 0.02]} material={eye} renderOrder={6}>
        <sphereGeometry args={[0.026, 18, 14]} />
      </mesh>
    </group>
  );
};
