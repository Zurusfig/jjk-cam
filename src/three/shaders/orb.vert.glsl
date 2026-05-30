uniform float uTime;
uniform float uFormProgress;
uniform vec3 uCoreColor;      // white-hot center
uniform vec3 uRimColor;       // saturated edge color
uniform vec3 uSecondaryColor; // outer-halo tint (== uRimColor when unused)
uniform float uCoreRadius;    // normalized radial pos where color is still white
uniform float uRimRadius;     // normalized radial pos where color is fully saturated
uniform float uColorVar;      // per-particle brightness jitter amount
uniform float uOrbRadius;
uniform float uAlphaScale; // launch fade: 1.0 = normal, 0.0 = invisible
uniform int uBehavior; // 0=neutral,1=repulsion,2=attraction,3=oscillate,4=directional

attribute vec3 aSeed;     // random unit-sphere direction per particle, static
attribute float aRadial;  // [0..1] shell position: 0 = dense core, 1 = outer rim
attribute float aPhase;   // random 0-2PI

varying float vAlpha;
varying vec3 vColor;

// Hash-based value noise (no external deps)
vec3 hash3(vec3 p) {
  p = fract(p * vec3(443.897, 441.423, 437.195));
  p += dot(p, p.yxz + 19.19);
  return fract((p.xxy + p.yzz) * p.zyx);
}

float noise3(vec3 p) {
  vec3 i = floor(p);
  vec3 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(mix(dot(hash3(i + vec3(0,0,0))*2.0-1.0, f - vec3(0,0,0)),
            dot(hash3(i + vec3(1,0,0))*2.0-1.0, f - vec3(1,0,0)), f.x),
        mix(dot(hash3(i + vec3(0,1,0))*2.0-1.0, f - vec3(0,1,0)),
            dot(hash3(i + vec3(1,1,0))*2.0-1.0, f - vec3(1,0,0)), f.x), f.y),
    mix(mix(dot(hash3(i + vec3(0,0,1))*2.0-1.0, f - vec3(0,0,1)),
            dot(hash3(i + vec3(1,0,1))*2.0-1.0, f - vec3(1,0,1)), f.x),
        mix(dot(hash3(i + vec3(0,1,1))*2.0-1.0, f - vec3(0,1,1)),
            dot(hash3(i + vec3(1,1,1))*2.0-1.0, f - vec3(1,1,1)), f.x), f.y),
    f.z
  );
}

void main() {
  // Ease-in-out for formProgress
  float t = uFormProgress;
  float ease = t < 0.5 ? 2.0*t*t : -1.0+(4.0-2.0*t)*t;

  // Shell radius: core particles (aRadial~0) cluster tight, rim particles spread.
  float r = uOrbRadius;
  float coreR = r * 0.12;
  float rimR  = r * 1.10;
  float targetR = mix(coreR, rimR, aRadial);

  // Gather phase: scattered wide -> converge to shell position.
  float gatherR = mix(r * 4.0, targetR, ease);

  vec3 dir = normalize(aSeed);

  // Tangential spiral during the gather, decaying as the orb stabilizes.
  vec3 tangent = normalize(cross(dir, vec3(0.0, 1.0, 0.01)));
  float spiralAmt = (1.0 - ease) * r * 3.0;
  vec3 orbPos = dir * gatherR + tangent * spiralAmt * sin(uTime * 3.0 + aPhase);

  // Idle turbulence (only once formed)
  float noiseAmt = targetR * 0.3 * ease;
  vec3 noiseInput = dir * 8.0 + uTime * 0.8;
  vec3 noiseDisp = vec3(
    noise3(noiseInput),
    noise3(noiseInput + vec3(100.0, 0.0, 0.0)),
    noise3(noiseInput + vec3(0.0, 100.0, 0.0))
  ) * noiseAmt;
  orbPos += noiseDisp;

  // Behavior flavor
  float behaviorAmt = ease;
  if (uBehavior == 1) {        // repulsion: pulse outward
    float pulse = sin(uTime * 2.0 + aPhase) * 0.5 + 0.5;
    orbPos += dir * pulse * targetR * 0.5 * behaviorAmt;
  } else if (uBehavior == 2) { // attraction: pull inward
    float pull = cos(uTime * 1.5 + aPhase) * 0.5 + 0.5;
    orbPos -= dir * pull * targetR * 0.4 * behaviorAmt;
  } else if (uBehavior == 3) { // oscillate: violent
    float osc = sin(uTime * 4.0 + aPhase);
    orbPos += dir * osc * targetR * 0.6 * behaviorAmt;
  }

  // Slow cloud rotation
  float angle = uTime * 0.3;
  float cosA = cos(angle), sinA = sin(angle);
  vec3 rotated = vec3(
    orbPos.x * cosA - orbPos.z * sinA,
    orbPos.y,
    orbPos.x * sinA + orbPos.z * cosA
  );

  vec4 mvPos = modelViewMatrix * vec4(rotated, 1.0);
  gl_Position = projectionMatrix * mvPos;

  // Core points larger/brighter for the white-hot center; rim points small.
  float baseSize = mix(7.0, 3.0, aRadial);
  gl_PointSize = baseSize * ease * (300.0 / -mvPos.z);
  gl_PointSize = clamp(gl_PointSize, 1.0, 22.0);

  // --- Light-source color gradient: white center -> saturated rim ----------
  float ct = smoothstep(uCoreRadius, uRimRadius, aRadial);
  vec3 col = mix(uCoreColor, uRimColor, ct);
  // Outermost shell bleeds toward the secondary tint (Hollow Purple -> blue).
  col = mix(col, uSecondaryColor, smoothstep(0.7, 1.0, aRadial));
  // Per-particle brightness jitter for depth (deterministic from seed).
  float jitter = (hash3(aSeed * 13.37).x - 0.5) * uColorVar;
  vColor = clamp(col + jitter, 0.0, 1.0);

  // Core stays near full brightness; rim fades so the edge reads as a halo.
  float layerAlpha = mix(1.0, 0.32, aRadial);
  vAlpha = ease * layerAlpha * uAlphaScale;
}
