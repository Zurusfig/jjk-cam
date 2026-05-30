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

  // Very subtle brightness boost at sprite center — just enough to feel like
  // light emission without washing the color out to white.
  vec3 col = vColor + vColor * pow(1.0 - dist * 2.0, 5.0) * 0.35;

  gl_FragColor = vec4(col, alpha);
}
