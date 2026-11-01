import {ThreeCanvas} from "@remotion/three";
import {Composition, useVideoConfig} from "remotion";
import {Scene} from "./aquarium/Scene";

/**
 * Vertical 9:16 holographic aquarium.
 * 360 frames at 30fps. Every swim cycle is an integer, so the shot loops.
 */
export const HolographicAquarium = () => {
  const {width, height, fps} = useVideoConfig();

  return (
    <div style={{width, height, backgroundColor: "#000000"}}>
      <ThreeCanvas
        name="Aquarium"
        width={width}
        height={height}
        premountFor={fps}
        dpr={1}
        camera={{fov: 27, near: 0.08, far: 40, position: [0, 0.02, 8.05]}}
        gl={{antialias: true, alpha: false, powerPreference: "high-performance"}}
        style={{backgroundColor: "#000000"}}
        onCreated={({gl}) => {
          gl.setClearColor(0x000000, 1);
        }}
      >
        <Scene />
      </ThreeCanvas>
    </div>
  );
};

export const HolographicAquariumComposition = () => {
  return (
    <Composition
      id="HolographicAquarium"
      component={HolographicAquarium}
      durationInFrames={360}
      fps={30}
      width={1080}
      height={1920}
    />
  );
};
