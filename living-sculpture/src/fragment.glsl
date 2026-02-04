uniform vec3 uColorA;
uniform vec3 uColorB;
uniform vec3 uColorC;
uniform float uHover;

varying float vDistortion;
varying vec3 vNormal;
varying vec3 vViewPosition;

void main() {
  vec3 normal = normalize(vNormal);
  vec3 viewDir = normalize(vViewPosition);
  
  // 1. Basic Gradient
  float distort = vDistortion * 0.5 + 0.5;
  vec3 baseColor = mix(uColorA, uColorB, distort);
  baseColor = mix(baseColor, uColorC, smoothstep(0.8, 1.0, distort));

  // 2. Fresnel (Rim Light)
  float fresnel = dot(viewDir, normal);
  float rim = pow(1.0 - max(fresnel, 0.0), 3.0); 

  // 3. Specular Highlight
  vec3 lightDir = normalize(vec3(1.0, 1.0, 1.0)); 
  vec3 reflectDir = reflect(-lightDir, normal);
  float spec = pow(max(dot(viewDir, reflectDir), 0.0), 32.0);

  // 4. Iridescence
  vec3 iridescence = 0.5 + 0.5 * cos(3.0 * viewDir.y + vec3(0.0, 2.0, 4.0));
  
  // Combine
  vec3 finalColor = baseColor;
  finalColor = mix(finalColor, iridescence, 0.15); 
  finalColor += vec3(0.8, 0.9, 1.0) * rim * 0.5;
  finalColor += vec3(1.0) * spec * 0.8;
  finalColor = mix(finalColor, vec3(1.0), uHover * 0.5); 

  gl_FragColor = vec4(finalColor, 1.0);
}