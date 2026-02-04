import * as THREE from 'three';
// Import Post-Processing
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';

// Import shaders
import vertexShader from './vertex.glsl?raw';
import fragmentShader from './fragment.glsl?raw';

// --- 1. SETUP SCENE ---
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x050505);

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 100);
camera.position.z = 2.5;

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.toneMapping = THREE.ReinhardToneMapping;
document.body.appendChild(renderer.domElement);

// --- 2. AUDIO SETUP (MICROPHONE) ---
let analyser;
let dataArray;
let isAudioActive = false;

// Create a simple overlay button via JavaScript
const overlay = document.createElement('div');
overlay.style.position = 'absolute';
overlay.style.top = '0';
overlay.style.left = '0';
overlay.style.width = '100%';
overlay.style.height = '100%';
overlay.style.display = 'flex';
overlay.style.justifyContent = 'center';
overlay.style.alignItems = 'center';
overlay.style.backgroundColor = 'rgba(0,0,0,0.8)';
overlay.style.color = 'white';
overlay.style.fontFamily = 'monospace';
overlay.style.fontSize = '24px';
overlay.style.cursor = 'pointer';
overlay.innerHTML = "[ CLICK TO AWAKEN ORGANISM ]";
document.body.appendChild(overlay);

// Activate Audio on Click
overlay.addEventListener('click', async () => {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        const source = audioCtx.createMediaStreamSource(stream);
        
        analyser = audioCtx.createAnalyser();
        analyser.fftSize = 256; // How detailed the audio analysis is
        source.connect(analyser);
        
        const bufferLength = analyser.frequencyBinCount;
        dataArray = new Uint8Array(bufferLength);
        
        isAudioActive = true;
        overlay.style.display = 'none'; // Hide overlay
        console.log("Audio System Online");
    } catch (err) {
        console.error("Microphone access denied:", err);
        overlay.innerHTML = "MICROPHONE DENIED";
    }
});

// --- 3. POST PROCESSING ---
const renderScene = new RenderPass(scene, camera);

const bloomPass = new UnrealBloomPass(
    new THREE.Vector2(window.innerWidth, window.innerHeight), 
    1.5, 0.4, 0.85
);

const composer = new EffectComposer(renderer);
composer.addPass(renderScene);
composer.addPass(bloomPass);

// --- 4. INTERACTION ---
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2(9999, 9999);
let hoverValue = 0; 

// --- 5. GEOMETRY & MATERIAL ---
const geometry = new THREE.IcosahedronGeometry(1, 100);

const material = new THREE.ShaderMaterial({
  vertexShader,
  fragmentShader,
  uniforms: {
    uTime: { value: 0 },
    uNoiseStrength: { value: 0.2 },
    uNoiseSpeed: { value: 0.2 },
    uColorA: { value: new THREE.Color('#1a0029') }, 
    uColorB: { value: new THREE.Color('#ff0055') }, 
    uColorC: { value: new THREE.Color('#00ffcc') }, 
    uHover: { value: 0 }
  },
  wireframe: false 
});

const organism = new THREE.Mesh(geometry, material);
scene.add(organism);

// --- 6. ANIMATION LOOP ---
const clock = new THREE.Clock();

function animate() {
  const elapsedTime = clock.getElapsedTime();

  // A. Audio Processing
  let audioStrength = 0;
  if (isAudioActive) {
      analyser.getByteFrequencyData(dataArray);
      
      // Calculate average volume of lower frequencies (Bass)
      // We look at the first 20 bins of the frequency data
      let sum = 0;
      const bassFreqs = 20; 
      for(let i = 0; i < bassFreqs; i++) {
          sum += dataArray[i];
      }
      const average = sum / bassFreqs;
      
      // Normalize 0-255 range to 0.0-1.0 range
      audioStrength = average / 255.0; 
  }

  // B. Raycasting
  raycaster.setFromCamera(mouse, camera);
  const intersects = raycaster.intersectObject(organism);
  const targetHover = intersects.length > 0 ? 1.0 : 0.0;
  hoverValue += (targetHover - hoverValue) * 0.1;

  // C. Update Uniforms
  material.uniforms.uTime.value = elapsedTime;
  material.uniforms.uHover.value = hoverValue; 
  
  // D. The Mix: Base Strength + Hover + Audio
  // Base: 0.2
  // Audio: Adds up to 1.0 based on volume
  material.uniforms.uNoiseStrength.value = 0.2 + (audioStrength * 1.5); 
  
  // Also speed up the animation when loud
  material.uniforms.uNoiseSpeed.value = 0.2 + (audioStrength * 0.5);

  // E. Dynamic Bloom
  bloomPass.strength = 1.5 + hoverValue * 1.5 + (audioStrength * 2.0);

  // F. Rotation
  organism.rotation.y = elapsedTime * 0.1;
  organism.rotation.z = elapsedTime * 0.05;

  composer.render();
  requestAnimationFrame(animate);
}

animate();

// Event Listeners
window.addEventListener('mousemove', (event) => {
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
});

window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    composer.setSize(window.innerWidth, window.innerHeight);
});