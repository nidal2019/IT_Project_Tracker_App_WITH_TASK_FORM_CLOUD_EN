import {useLayoutEffect, useRef, type ReactNode} from "react";
import * as THREE from "three";
import type {FishPath} from "./paths";
import {poseOnPath} from "./paths";
import {useLoopTime} from "./time";

type SwimGroupProps = {
  readonly path: FishPath;
  readonly children: ReactNode;
};

/**
 * Places a fish on its closed path for this frame.
 * Orientation is applied in layout so the render samples the posed fish.
 */
export const SwimGroup = ({path, children}: SwimGroupProps) => {
  const time = useLoopTime();
  const pose = poseOnPath(path, time);
  const group = useRef<THREE.Group>(null);

  useLayoutEffect(() => {
    const current = group.current;
    if (!current) {
      return;
    }
    current.position.set(pose.x, pose.y, pose.z);
    current.quaternion.set(pose.qx, pose.qy, pose.qz, pose.qw);
    current.scale.setScalar(path.scale);
  }, [path.scale, pose]);

  return <group ref={group}>{children}</group>;
};
