varying float vAlpha;
varying vec3 vColor;

void main() {
  // Circular soft dot
  vec2 uv = gl_PointCoord - 0.5;
  float dist = length(uv);
  if (dist > 0.5) discard;

  // Soft falloff: brightest center, fades to 0 at edge
  float alpha = (1.0 - dist * 2.0);
  alpha = alpha * alpha; // quadratic for softer edge
  alpha *= vAlpha;

  gl_FragColor = vec4(vColor, alpha);
}
