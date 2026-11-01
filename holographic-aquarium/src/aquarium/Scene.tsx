import {useMemo} from "react";
import {useThree} from "@react-three/fiber";
import {useVideoConfig} from "remotion";
import * as THREE from "three";
import {glassPlane, holoBox} from "./geometry";
import {createGlassMaterial, createHoloMaterial} from "./materials";
import {Plecostomus} from "./Plecostomus";
import {School} from "./Fish";
import {CAMERA, GLASS_Z} from "./paths";
import {useLoopTime} from "./time";

/**
 * Extremely slow push that returns to the same frame, so the shot can loop.
 */
const CameraRig = () => {
  const time = useLoopTime();
  const camera = useThree((state) => state.camera) as THREE.PerspectiveCamera;
  const {width, height} = useVideoConfig();
  const breathe = Math.sin(time * Math.PI * 2);

  camera.fov = CAMERA.fov;
  camera.position.set(
    breathe * 0.012,
    CAMERA.y + breathe * 0.01,
    CAMERA.z - breathe * CAMERA.push,
  );
  camera.up.set(0, 1, 0);
  camera.lookAt(CAMERA.lookX, CAMERA.lookY, CAMERA.lookZ);
  camera.aspect = width / height;
  camera.near = 0.08;
  camera.far = 40;
  camera.updateProjectionMatrix();
  return null;
};

const HoloVolume = () => {
  const material = useMemo(() => createHoloMaterial(), []);
  return (
    <mesh
      geometry={holoBox}
      material={material}
      position={[0, 0.68, 0.05]}
      renderOrder={2}
    />
  );
};

const GlassPane = () => {
  const material = useMemo(() => createGlassMaterial(), []);
  return (
    <mesh
      geometry={glassPlane}
      material={material}
      position={[0, -0.25, GLASS_Z]}
      renderOrder={3}
    />
  );
};

/** Black void, holographic volume, school, and the foreground pleco. */
export const Scene = () => {
  return (
    <>
      <color attach="background" args={["#000000"]} />
      <CameraRig />
      <School />
      <HoloVolume />
      <GlassPane />
      <Plecostomus />
    </>
  );
};
