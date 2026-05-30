varying float vAlpha;
varying vec3 vColor;

void main() {
  // Soft circular sprite: brightest at center, alpha -> 0 at the edge.
  vec2 uv = gl_PointCoord - 0.5;
  float dist = length(uv);
  if (dist > 0.5) discard;

  float alpha = 1.0 - dist * 2.0;
  alpha = alpha * alpha; // quadratic falloff for a softer glow edge
  alpha *= vAlpha;

  // Tiny white hotspot at the sprite center boosts the emissive "light" feel.
  vec3 col = vColor + vec3(pow(1.0 - dist * 2.0, 6.0)) * 0.6;

  gl_FragColor = vec4(col, alpha);
}
