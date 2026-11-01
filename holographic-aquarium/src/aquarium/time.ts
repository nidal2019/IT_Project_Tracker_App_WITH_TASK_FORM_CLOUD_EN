import { useCurrentFrame, useVideoConfig } from "remotion";

/**
 * Shared shader clock. Every motion multiplies this by an integer cycle count
 * so the shot is identical on the first and last frame.
 */
export const timeUniform: {value: number} = {value: 0};

/** Loop position in [0, 1). Frame 0 and the frame after the last frame match. */
export const useLoopTime = (): number => {
  const frame = useCurrentFrame();
  const {durationInFrames} = useVideoConfig();
  const time = frame / durationInFrames;
  timeUniform.value = time;
  return time;
};
