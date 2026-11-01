/** Swim deformation. uFin is 0 on a body and 1 on a fin (wave follows uv.x). */
export const fishVertexShader = /* glsl */ `
varying vec3 vNormal;
varying vec3 vWorld;
varying vec3 vLocal;
varying vec2 vUv;

uniform float uTime;
uniform float uPhase;
uniform float uWag;
uniform float uAmp;
uniform float uHalf;
uniform float uFin;

void main() {
  vUv = uv;
  vLocal = position;
  float phase = uTime * uWag * 6.28318530718 + uPhase;
  float along = clamp((uHalf - position.x) / max(uHalf * 2.0, 0.0001), 0.0, 1.0);
  float bodyWave = sin(along * 6.4 - phase) * uAmp * pow(along, 1.45);
  float finWave = sin(uv.x * 5.2 - phase) * uAmp * uv.x;
  vec3 displaced = position;
  displaced.z += mix(bodyWave, finWave, uFin);
  vec4 world = modelMatrix * vec4(displaced, 1.0);
  vWorld = world.xyz;
  vNormal = normalize(mat3(modelMatrix) * normal);
  gl_Position = projectionMatrix * viewMatrix * world;
}
`;

/** Species patterns, rim light, iridescence and caustics. Background is never shaded. */
export const fishFragmentShader = /* glsl */ `
varying vec3 vNormal;
varying vec3 vWorld;
varying vec3 vLocal;
varying vec2 vUv;

uniform float uTime;
uniform float uPattern;
uniform float uGloss;
uniform float uGlow;
uniform vec3 uTint;

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  float a = hash(i);
  float b = hash(i + vec2(1.0, 0.0));
  float c = hash(i + vec2(0.0, 1.0));
  float d = hash(i + vec2(1.0, 1.0));
  return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}

float fbm(vec2 p) {
  float value = 0.0;
  float amplitude = 0.5;
  for (int i = 0; i < 4; i++) {
    value += amplitude * noise(p);
    p *= 2.13;
    amplitude *= 0.5;
  }
  return value;
}

float caustic(vec3 p) {
  float t = uTime * 6.28318530718;
  float a = sin(p.x * 17.0 + t) * sin(p.y * 13.0 - t * 2.0);
  float b = sin(p.x * 8.0 - p.y * 9.0 + t * 3.0);
  return pow(max((a * 0.5 + 0.5) * (b * 0.5 + 0.5), 0.0), 1.7);
}

vec3 tetraBody(vec3 local) {
  float u = clamp(local.x * 2.15 + 0.5, 0.0, 1.0);
  float v = clamp(local.y / 0.16 + 0.5, 0.0, 1.0);
  vec3 silver = vec3(0.74, 0.84, 0.88);
  vec3 belly = vec3(0.94, 0.96, 0.97);
  vec3 back = vec3(0.32, 0.52, 0.5);
  vec3 base = mix(belly, silver, smoothstep(0.22, 0.62, v));
  base = mix(base, back, smoothstep(0.64, 0.92, v));
  float blueBand = exp(-pow((v - 0.6) * 16.0, 2.0));
  float redBand = exp(-pow((v - 0.4) * 18.0, 2.0)) * smoothstep(0.62, 0.12, u);
  vec3 blue = vec3(0.05, 0.92, 1.0);
  vec3 red = vec3(1.0, 0.06, 0.16);
  base = mix(base, blue, blueBand);
  base = mix(base, red, redBand * 0.95);
  float scale = abs(fract(u * 36.0) - 0.5) + abs(fract(v * 14.0) - 0.5);
  base *= mix(0.92, 1.0, smoothstep(0.2, 0.48, scale));
  return base;
}

vec3 tetraEmission(vec3 local) {
  float u = clamp(local.x * 2.15 + 0.5, 0.0, 1.0);
  float v = clamp(local.y / 0.16 + 0.5, 0.0, 1.0);
  float blueBand = exp(-pow((v - 0.6) * 16.0, 2.0));
  float redBand = exp(-pow((v - 0.4) * 18.0, 2.0)) * smoothstep(0.62, 0.12, u);
  return vec3(0.0, 0.45, 0.72) * blueBand + vec3(0.62, 0.02, 0.05) * redBand;
}

vec3 tetraFin(vec2 uv) {
  float ray = smoothstep(0.28, 0.04, abs(fract(uv.y * 14.0) - 0.5));
  vec3 membrane = vec3(0.82, 0.9, 0.95);
  vec3 lower = vec3(1.0, 0.12, 0.2);
  vec3 upper = vec3(0.35, 0.85, 1.0);
  vec3 tint = mix(lower, upper, smoothstep(0.42, 0.62, uv.y));
  return mix(membrane, tint, ray * 0.85);
}

float finAlpha(vec2 uv, float rays) {
  float ray = smoothstep(0.32, 0.05, abs(fract(uv.y * rays) - 0.5));
  float edge = smoothstep(0.0, 0.06, uv.x) * smoothstep(1.0, 0.78, uv.x);
  float side = smoothstep(0.0, 0.08, uv.y) * smoothstep(1.0, 0.92, uv.y);
  return (0.28 + ray * 0.72) * edge * side;
}

vec3 discusColor(vec3 local) {
  float r = length(local.xy) / 0.36;
  float bars = smoothstep(0.38, 0.72, 0.5 + 0.5 * sin(local.x * 26.0 + sin(local.y * 8.0) * 0.9));
  vec3 turquoise = vec3(0.02, 0.78, 0.74);
  vec3 orange = vec3(1.0, 0.38, 0.05);
  vec3 base = mix(turquoise, orange, bars);
  float speck = hash(floor(local.xy * 46.0 + 2.0));
  base = mix(base, vec3(1.0, 0.62, 0.18), step(0.9, speck) * 0.65);
  float grain = fbm(local.xy * 22.0);
  base *= 0.82 + grain * 0.28;
  base *= mix(0.45, 1.0, smoothstep(1.05, 0.35, r));
  float gill = smoothstep(0.1, 0.0, length(local.xy - vec2(0.2, -0.01)));
  base = mix(base, base * vec3(0.65, 0.8, 0.85), gill);
  return base;
}

vec3 discusEmission(vec3 local) {
  float bars = smoothstep(0.38, 0.72, 0.5 + 0.5 * sin(local.x * 26.0 + sin(local.y * 8.0) * 0.9));
  vec3 turquoise = vec3(0.05, 0.85, 0.8);
  vec3 orange = vec3(1.0, 0.42, 0.08);
  return mix(turquoise, orange, bars) * 0.18;
}

vec3 mandarinColor(vec3 local) {
  vec3 orange = vec3(1.0, 0.36, 0.02);
  vec3 blue = vec3(0.08, 0.32, 1.0);
  vec3 cyan = vec3(0.25, 0.9, 1.0);
  float warp = sin(local.y * 28.0 + sin(local.x * 22.0) * 1.3);
  float maze = abs(fract(local.y * 10.5 + warp * 0.16 + sin(local.x * 14.0) * 0.12) - 0.5);
  float line = smoothstep(0.14, 0.035, maze);
  float warp2 = sin(local.x * 24.0 + sin(local.y * 16.0));
  float maze2 = abs(fract(local.x * 8.5 + warp2 * 0.14) - 0.5);
  float line2 = smoothstep(0.12, 0.03, maze2);
  float lines = max(line, line2 * 0.8);
  vec3 base = mix(orange, mix(blue, cyan, 0.4), lines);
  float spot = hash(floor((local.xy + 3.0) * 16.0));
  base = mix(base, vec3(0.55, 1.0, 0.15), step(0.94, spot) * (1.0 - lines));
  return base;
}

vec3 mandarinEmission(vec3 local) {
  float warp = sin(local.y * 28.0 + sin(local.x * 22.0) * 1.3);
  float maze = abs(fract(local.y * 10.5 + warp * 0.16 + sin(local.x * 14.0) * 0.12) - 0.5);
  float line = smoothstep(0.14, 0.035, maze);
  return mix(vec3(0.55, 0.16, 0.02), vec3(0.1, 0.45, 0.85), line) * (0.16 + line * 0.4);
}

float plecoHeight(vec2 p) {
  float along = p.x * 5.2 + fbm(p * 2.2) * 0.12;
  float across = p.y * 3.4 + fbm(p * 2.8 + 4.0) * 0.08;
  float rowEdge = abs(fract(along) - 0.5);
  float colEdge = abs(fract(across) - 0.5);
  float seams = smoothstep(0.36, 0.48, rowEdge) + smoothstep(0.4, 0.49, colEdge) * 0.65;
  float blot = smoothstep(0.55, 0.8, fbm(p * 6.0));
  return seams * 0.22 + blot * 0.05;
}

vec3 plecoColor(vec3 local) {
  vec2 p = local.xy;
  float side = smoothstep(0.05, 0.2, abs(local.y));
  vec3 belly = vec3(0.73, 0.58, 0.4);
  vec3 armor = vec3(0.36, 0.24, 0.16);
  vec3 dark = vec3(0.1, 0.06, 0.045);
  vec3 base = mix(belly, armor, side * 0.85);
  float blot = fbm(p * 5.5 + vec2(2.0, 0.4));
  base = mix(base, dark, smoothstep(0.62, 0.82, blot) * 0.75);
  float h = plecoHeight(p);
  base = mix(base, dark * 0.9, smoothstep(0.1, 0.22, h) * 0.55);
  float grain = fbm(p * 28.0);
  base *= 0.86 + grain * 0.22;
  return base;
}

vec3 suckerColor(vec3 local) {
  float n = fbm(local.xy * 18.0);
  float r = length(local.xy) * (1.0 + (n - 0.5) * 0.1);
  float lip = smoothstep(0.05, 0.07, r) * smoothstep(0.108, 0.082, r);
  float cavity = smoothstep(0.075, 0.02, r);
  vec3 flesh = vec3(0.6, 0.38, 0.31);
  vec3 deep = vec3(0.26, 0.09, 0.08);
  vec3 base = mix(flesh, deep, cavity);
  float ridge = 0.5 + 0.5 * sin(r * 48.0 + n * 4.0 - uTime * 25.1327412);
  base = mix(base, vec3(0.74, 0.52, 0.44), lip * ridge * 0.4);
  float rasp = smoothstep(0.036, 0.012, r);
  base = mix(base, vec3(0.42, 0.26, 0.22) * (0.8 + n * 0.35), rasp);
  base *= 0.9 + fbm(local.xy * 36.0) * 0.16;
  return base;
}

void main() {
  vec3 base;
  vec3 emission = vec3(0.0);
  float alpha = 1.0;
  float pattern = uPattern;

  if (pattern < 0.5) {
    base = tetraBody(vLocal);
    emission = tetraEmission(vLocal);
  } else if (pattern < 1.5) {
    base = tetraFin(vUv);
    emission = mix(vec3(0.9, 0.05, 0.1), vec3(0.2, 0.7, 1.0), smoothstep(0.4, 0.65, vUv.y)) * 0.35;
    alpha = finAlpha(vUv, 14.0) * 0.85;
  } else if (pattern < 2.5) {
    base = discusColor(vLocal);
    emission = discusEmission(vLocal);
  } else if (pattern < 3.5) {
    float ray = smoothstep(0.25, 0.55, 0.5 + 0.5 * sin(vUv.y * 26.0 * 6.28318530718));
    vec3 membrane = vec3(0.08, 0.62, 0.58);
    vec3 rayColor = vec3(0.9, 0.4, 0.08);
    base = mix(membrane, rayColor, 0.35 + ray * 0.3);
    emission = base * 0.08;
    alpha = 0.78 * smoothstep(0.0, 0.18, vUv.x) * smoothstep(1.0, 0.45, vUv.x);
  } else if (pattern < 4.5) {
    base = mandarinColor(vLocal);
    emission = mandarinEmission(vLocal);
  } else if (pattern < 5.5) {
    base = mandarinColor(vec3(vUv.x * 0.4 - 0.2, (vUv.y - 0.5) * 0.35, 0.0));
    emission = mandarinEmission(vec3(vUv.x * 0.4 - 0.2, (vUv.y - 0.5) * 0.35, 0.0)) * 0.8;
    alpha = finAlpha(vUv, 18.0) * 1.2;
  } else if (pattern < 6.5) {
    base = plecoColor(vLocal);
    float glint = pow(max(sin(vLocal.x * 70.0) * sin(vLocal.y * 50.0), 0.0), 18.0);
    emission = vec3(0.45, 0.6, 0.75) * glint * 0.35;
  } else if (pattern < 7.5) {
    float ray = smoothstep(0.2, 0.03, abs(fract(vUv.y * 18.0) - 0.5));
    vec3 membrane = vec3(0.55, 0.38, 0.24);
    vec3 rayColor = vec3(0.1, 0.06, 0.04);
    base = mix(membrane, rayColor, ray);
    float grain = fbm(vUv * vec2(18.0, 30.0));
    base *= 0.84 + grain * 0.22;
    emission = vec3(0.35, 0.25, 0.15) * 0.08;
    alpha = mix(0.78, 0.98, ray) * smoothstep(0.0, 0.05, vUv.x) * smoothstep(1.0, 0.82, vUv.x);
  } else {
    base = suckerColor(vLocal);
    emission = vec3(0.45, 0.2, 0.16) * 0.12;
  }

  base *= uTint;
  emission *= uTint * uGlow;

  vec3 normal = normalize(vNormal);
  if (pattern > 5.5 && pattern < 6.5) {
    float e = 0.004;
    float h0 = plecoHeight(vLocal.xy);
    float hx = plecoHeight(vLocal.xy + vec2(e, 0.0)) - h0;
    float hy = plecoHeight(vLocal.xy + vec2(0.0, e)) - h0;
    normal = normalize(normal + vec3(-hx, -hy, 0.0) * 6.5);
  }

  float finMask = mod(floor(pattern + 0.5), 2.0);
  vec3 viewDir = normalize(cameraPosition - vWorld);
  float facing = max(dot(normal, viewDir), 0.0);
  float rim = pow(1.0 - facing, 2.4);
  vec3 keyDir = normalize(vec3(0.22, 0.55, 0.8));
  float ndl = dot(normal, keyDir) * 0.5 + 0.5;
  float wrap = pow(clamp(ndl, 0.0, 1.0), 1.55);
  vec3 halfVec = normalize(keyDir + viewDir);
  float specPower = mix(22.0, 110.0, uGloss);
  float spec = pow(max(dot(normal, halfVec), 0.0), specPower);
  float shine = caustic(vWorld);
  float sparkle = pow(max(sin(vLocal.x * 90.0 + uTime * 12.56637) * sin(vLocal.y * 60.0 - uTime * 6.28318530718), 0.0), 8.0);

  vec3 rimColor = mix(vec3(1.0, 0.52, 0.28), vec3(0.35, 0.82, 1.0), 0.55 + 0.45 * normal.y);
  vec3 iri = 0.5 + 0.5 * cos(6.28318530718 * (facing * 1.35 + vec3(0.0, 0.33, 0.67) + uTime));

  vec3 color = base * (0.015 + wrap * 0.95);
  color += rimColor * rim * mix(0.7, 0.22, finMask);
  color += vec3(0.85, 0.93, 1.0) * spec * (0.18 + shine * 0.55) * (0.25 + uGloss) * mix(1.0, 0.3, finMask);
  color += iri * rim * 0.22 * mix(1.0, 0.4, finMask);
  color += vec3(0.8, 0.95, 1.0) * sparkle * 0.08;
  color += emission;

  if (alpha < 0.02) discard;
  gl_FragColor = vec4(color, clamp(alpha, 0.0, 1.0));
}
`;

export const eyeVertexShader = /* glsl */ `
varying vec3 vNormal;
void main() {
  vNormal = normalize(normal);
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

export const eyeFragmentShader = /* glsl */ `
varying vec3 vNormal;
uniform vec3 uIris;
uniform float uStripe;
uniform vec3 uTint;

void main() {
  vec3 n = normalize(vNormal);
  float r = length(n.xy);
  float pupil = smoothstep(0.22, 0.34, r);
  vec3 iris = mix(uIris, uIris * 0.45, smoothstep(0.2, 0.48, r));
  vec3 color = mix(vec3(0.01, 0.012, 0.015), iris, pupil);
  float blue = exp(-pow((n.y - 0.02) * 7.0, 2.0)) * uStripe;
  color = mix(color, vec3(0.05, 0.75, 1.0), blue * pupil);
  float catchLight = smoothstep(0.055, 0.0, distance(n.xy, vec2(0.18, 0.22)));
  color += vec3(1.0) * catchLight;
  float rim = pow(1.0 - max(n.z, 0.0), 2.0);
  color += vec3(0.6, 0.85, 1.0) * rim * 0.35;
  gl_FragColor = vec4(color * uTint, 1.0);
}
`;

export const holoVertexShader = /* glsl */ `
varying vec3 vLocal;
void main() {
  vLocal = position;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

export const holoFragmentShader = /* glsl */ `
varying vec3 vLocal;
uniform vec3 uHalf;

float secondMin(vec3 d) {
  float smallest = min(d.x, min(d.y, d.z));
  float largest = max(d.x, max(d.y, d.z));
  return d.x + d.y + d.z - smallest - largest;
}

void main() {
  float green = secondMin(uHalf - abs(vLocal));
  float red = secondMin(uHalf - abs(vLocal + vec3(0.012, 0.0, 0.0)));
  float blue = secondMin(uHalf - abs(vLocal - vec3(0.01, 0.008, 0.0)));
  float lineG = 1.0 - smoothstep(0.0, 0.01, green);
  float lineR = 1.0 - smoothstep(0.0, 0.01, red);
  float lineB = 1.0 - smoothstep(0.0, 0.01, blue);
  float lower = smoothstep(-uHalf.y, -uHalf.y + 0.28, vLocal.y);
  float fade = mix(0.05, 0.55, lower);
  vec3 color = vec3(lineR * 0.85, lineG * 0.55, lineB * 1.0) * fade;
  float alpha = clamp(max(color.r, max(color.g, color.b)), 0.0, 1.0);
  if (alpha < 0.02) discard;
  gl_FragColor = vec4(color, alpha);
}
`;

export const glassVertexShader = /* glsl */ `
varying vec3 vWorld;
void main() {
  vec4 world = modelMatrix * vec4(position, 1.0);
  vWorld = world.xyz;
  gl_Position = projectionMatrix * viewMatrix * world;
}
`;

export const glassFragmentShader = /* glsl */ `
varying vec3 vWorld;
uniform float uTime;
uniform float uCx;
uniform float uCy;
uniform float uRx;
uniform float uRy;
uniform float uSway;
uniform float uMouth;

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  float a = hash(i);
  float b = hash(i + vec2(1.0, 0.0));
  float c = hash(i + vec2(0.0, 1.0));
  float d = hash(i + vec2(1.0, 1.0));
  return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}

float fbm(vec2 p) {
  float value = 0.0;
  float amplitude = 0.5;
  for (int i = 0; i < 4; i++) {
    value += amplitude * noise(p);
    p *= 2.07;
    amplitude *= 0.5;
  }
  return value;
}

vec2 mouthAt(float s) {
  float a = s * 6.28318530718;
  float x = uCx + sin(a) * uRx;
  float y = uCy + sin(a) * cos(a) * uRy;
  float yaw = 1.57079632679 + sin(a) * uSway;
  return vec2(x, y) + vec2(cos(yaw), sin(yaw)) * uMouth;
}

void main() {
  vec2 p = vWorld.xy;
  vec2 spot = vec2(uCx, uCy + 0.12);
  float region = smoothstep(1.05, 0.15, length((p - spot) / vec2(0.62, 0.72)));
  float n = fbm(p * 16.0);
  vec3 algae = mix(vec3(0.05, 0.09, 0.04), vec3(0.12, 0.16, 0.06), n);
  float cleared = 0.0;
  for (int i = 0; i < 56; i++) {
    float s = float(i) / 56.0;
    float since = fract(uTime - s);
    float dist = distance(p, mouthAt(s));
    float wipe = exp(-dist * dist / 0.0032) * exp(-since / 0.14);
    cleared = max(cleared, wipe);
  }
  float alpha = (0.72 + n * 0.2) * region * (1.0 - cleared * 0.82);
  float trailEdge = smoothstep(0.18, 0.45, cleared) * smoothstep(0.9, 0.55, cleared);
  vec3 color = mix(algae, vec3(0.55, 0.68, 0.58), trailEdge);
  alpha += trailEdge * 0.025 * region;
  float band = (p.x - spot.x) * 0.7 - (p.y - spot.y) * 0.25;
  float streakR = exp(-pow(band + 0.02, 2.0) * 14.0);
  float streakG = exp(-pow(band, 2.0) * 14.0);
  float streakB = exp(-pow(band - 0.02, 2.0) * 14.0);
  vec3 fringe = vec3(streakR, streakG, streakB) * region * 0.02;
  float outAlpha = clamp(alpha + max(fringe.r, max(fringe.g, fringe.b)), 0.0, 0.72);
  if (outAlpha < 0.003) discard;
  vec3 outColor = (color * alpha + fringe) / max(outAlpha, 0.0001);
  gl_FragColor = vec4(outColor, outAlpha);
}
`;
