uniform float uTime;
uniform float uFormProgress;
uniform float uBlast;         // 0 = idle/forming, 0->1 = zoom-blast on release
uniform vec3 uCoreColor;
uniform vec3 uRimColor;
uniform vec3 uSecondaryColor;
uniform float uCoreRadius;
uniform float uRimRadius;
uniform float uColorVar;
uniform float uOrbRadius;
uniform float uAlphaScale;
uniform int uBehavior; // 0=neutral,1=repulsion,2=attraction,3=oscillate,4=directional

attribute vec3 aSeed;
attribute float aRadial;  // [0..1]: 0 = dense core, 1 = outer rim
attribute float aPhase;

varying float vAlpha;
varying vec3 vColor;

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
    mix(mix(dot(hash3(i+vec3(0,0,0))*2.0-1.0, f-vec3(0,0,0)),
            dot(hash3(i+vec3(1,0,0))*2.0-1.0, f-vec3(1,0,0)), f.x),
        mix(dot(hash3(i+vec3(0,1,0))*2.0-1.0, f-vec3(0,1,0)),
            dot(hash3(i+vec3(1,1,0))*2.0-1.0, f-vec3(1,0,0)), f.x), f.y),
    mix(mix(dot(hash3(i+vec3(0,0,1))*2.0-1.0, f-vec3(0,0,1)),
            dot(hash3(i+vec3(1,0,1))*2.0-1.0, f-vec3(1,0,1)), f.x),
        mix(dot(hash3(i+vec3(0,1,1))*2.0-1.0, f-vec3(0,1,1)),
            dot(hash3(i+vec3(1,1,1))*2.0-1.0, f-vec3(1,1,1)), f.x), f.y),
    f.z
  );
}

void main() {
  float t = uFormProgress;
  float ease = t < 0.5 ? 2.0*t*t : -1.0+(4.0-2.0*t)*t;

  float r = uOrbRadius;
  float coreR = r * 0.12;
  float rimR  = r * 1.10;
  float targetR = mix(coreR, rimR, aRadial);

  float gatherR = mix(r * 4.0, targetR, ease);
  vec3 dir = normalize(aSeed);

  vec3 tangent = normalize(cross(dir, vec3(0.0, 1.0, 0.01)));
  float spiralAmt = (1.0 - ease) * r * 3.0;
  vec3 orbPos = dir * gatherR + tangent * spiralAmt * sin(uTime * 3.0 + aPhase);

  float noiseAmt = targetR * 0.3 * ease;
  vec3 noiseInput = dir * 8.0 + uTime * 0.8;
  orbPos += vec3(
    noise3(noiseInput),
    noise3(noiseInput + vec3(100.0, 0.0, 0.0)),
    noise3(noiseInput + vec3(0.0, 100.0, 0.0))
  ) * noiseAmt;

  float behaviorAmt = ease;
  if (uBehavior == 1) {
    orbPos += dir * (sin(uTime*2.0+aPhase)*0.5+0.5) * targetR * 0.5 * behaviorAmt;
  } else if (uBehavior == 2) {
    orbPos -= dir * (cos(uTime*1.5+aPhase)*0.5+0.5) * targetR * 0.4 * behaviorAmt;
  } else if (uBehavior == 3) {
    orbPos += dir * sin(uTime*4.0+aPhase) * targetR * 0.6 * behaviorAmt;
  }

  // Slow rotation
  float angle = uTime * 0.3;
  float cosA = cos(angle), sinA = sin(angle);
  vec3 rotated = vec3(
    orbPos.x*cosA - orbPos.z*sinA,
    orbPos.y,
    orbPos.x*sinA + orbPos.z*cosA
  );

  // Blast: cubic ease-in expansion toward camera, particles fly outward from center.
  // The object-space expansion means the orb shell inflates uniformly in all
  // directions; because the camera sits at z=1 and the orb is near z=0, the
  // effect reads as a rush toward screen-fill.
  float blastEase = uBlast * uBlast * uBlast; // sharp snap feel
  rotated *= (1.0 + blastEase * 22.0);

  vec4 mvPos = modelViewMatrix * vec4(rotated, 1.0);
  gl_Position = projectionMatrix * mvPos;

  // Point size grows during blast so the fill looks solid
  float baseSize = mix(7.0, 3.0, aRadial);
  float sizeBoost = 1.0 + blastEase * 6.0;
  gl_PointSize = baseSize * ease * sizeBoost * (300.0 / -mvPos.z);
  gl_PointSize = clamp(gl_PointSize, 1.0, 60.0);

  // Color gradient: core highlight -> saturated rim -> secondary outer halo.
  // uCoreColor is now the orb's own bright/saturated color (not white) so the
  // center reads as an intense version of the rim color rather than washed out.
  float ct = smoothstep(uCoreRadius, uRimRadius, aRadial);
  vec3 col = mix(uCoreColor, uRimColor, ct);
  col = mix(col, uSecondaryColor, smoothstep(0.7, 1.0, aRadial));
  float jitter = (hash3(aSeed * 13.37).x - 0.5) * uColorVar;
  vColor = clamp(col + jitter, 0.0, 1.0);

  float layerAlpha = mix(1.0, 0.32, aRadial);
  // Alpha fades out quickly during blast (done at 70% expansion so it disappears cleanly)
  float blastFade = max(0.0, 1.0 - uBlast * 1.6);
  vAlpha = ease * layerAlpha * uAlphaScale * blastFade;
}
