uniform float uTime;
uniform float uFormProgress;
uniform vec3 uColor;
uniform float uOrbRadius;
uniform int uBehavior; // 0=neutral,1=repulsion,2=attraction,3=oscillate,4=directional

attribute vec3 aSeed;     // random vec3 per particle, static
attribute float aLayer;   // 0=core, 1=halo
attribute float aPhase;   // random 0-2PI

varying float vAlpha;
varying vec3 vColor;

// Hash-based 3D noise (no external deps)
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
  // Ease in-out for formProgress
  float t = uFormProgress;
  float ease = t < 0.5 ? 2.0*t*t : -1.0+(4.0-2.0*t)*t;

  // Base spherical position
  float r = uOrbRadius;
  float coreR = r * 0.4;
  float haloR = r * 1.2;
  float targetR = mix(coreR, haloR, aLayer);

  // Gather phase: particles start far away scattered, converge to targetR
  float gatherR = mix(r * 4.0, targetR, ease);

  // Direction from seed
  vec3 dir = normalize(aSeed);

  // Spiral: add tangential motion during gather
  vec3 tangent = normalize(cross(dir, vec3(0.0, 1.0, 0.01)));
  float spiralAmt = (1.0 - ease) * r * 3.0;
  vec3 orbPos = dir * gatherR + tangent * spiralAmt * sin(uTime * 3.0 + aPhase);

  // Idle noise displacement (active once formed)
  float noiseScale = 8.0;
  float noiseAmt = targetR * 0.3 * ease;
  vec3 noiseInput = dir * noiseScale + uTime * 0.8;
  float nx = noise3(noiseInput);
  float ny = noise3(noiseInput + vec3(100.0, 0.0, 0.0));
  float nz = noise3(noiseInput + vec3(0.0, 100.0, 0.0));
  vec3 noiseDisp = vec3(nx, ny, nz) * noiseAmt;
  orbPos += noiseDisp;

  // Behavior-specific displacement
  float behaviorAmt = ease;
  if (uBehavior == 1) { // repulsion: push outward
    float pulse = sin(uTime * 2.0 + aPhase) * 0.5 + 0.5;
    orbPos += dir * pulse * targetR * 0.5 * behaviorAmt;
  } else if (uBehavior == 2) { // attraction: pull inward
    float pull = cos(uTime * 1.5 + aPhase) * 0.5 + 0.5;
    orbPos -= dir * pull * targetR * 0.4 * behaviorAmt;
  } else if (uBehavior == 3) { // oscillate: violent
    float osc = sin(uTime * 4.0 + aPhase);
    orbPos += dir * osc * targetR * 0.6 * behaviorAmt;
  }

  // Slow rotation
  float angle = uTime * 0.3;
  float cosA = cos(angle), sinA = sin(angle);
  vec3 rotated = vec3(
    orbPos.x * cosA - orbPos.z * sinA,
    orbPos.y,
    orbPos.x * sinA + orbPos.z * cosA
  );

  gl_Position = projectionMatrix * modelViewMatrix * vec4(rotated, 1.0);

  // Point size: core bigger, halo smaller; shrink during gather
  float baseSize = mix(6.0, 3.0, aLayer);
  gl_PointSize = baseSize * ease * (300.0 / -( modelViewMatrix * vec4(rotated,1.0) ).z);
  gl_PointSize = clamp(gl_PointSize, 1.0, 20.0);

  // Alpha: dim during gather, bright when formed; halo dimmer
  float layerAlpha = mix(1.0, 0.4, aLayer);
  vAlpha = ease * layerAlpha;

  vColor = uColor;
}
