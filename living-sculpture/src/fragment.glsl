uniform vec3 uColorA;
uniform vec3 uColorB;
uniform vec3 uColorC;
uniform float uHover; // <--- The nervous system signal

varying float vDistortion;

void main() {
  float distort = vDistortion * 0.5 + 0.5;
  
  // Base Colors
  vec3 finalColor = mix(uColorA, uColorB, distort);
  finalColor = mix(finalColor, uColorC, smoothstep(0.8, 1.0, distort));

  // --- INTERACTION COLOR ---
  // A bright white/blue flash"
  vec3 hoverColor = vec3(1.0, 1.0, 1.0);
  
  // Mix in the flash based on how close the mouse is (uHover 0 to 1)
  finalColor = mix(finalColor, hoverColor, uHover * 0.5); 
  
  gl_FragColor = vec4(finalColor, 1.0);
}