import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { RGBShiftShader } from 'three/examples/jsm/shaders/RGBShiftShader.js';
import GUI from 'lil-gui';

import vertexShader from './vertex.glsl?raw';
import fragmentShader from './fragment.glsl?raw';

// --- 1. SETUP SCENE ---
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x050505);
// Inside Section 1
scene.fog = new THREE.FogExp2(0x050505, 0.02); // Deep black fog

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 100);
camera.position.set(0, 0, 3.5);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.toneMapping = THREE.ReinhardToneMapping;
document.body.appendChild(renderer.domElement);

// --- CONTROLS ---
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.05;
controls.enableZoom = true;
controls.minDistance = 1.5;
controls.maxDistance = 10;

// --- 2. GUI ---
const gui = new GUI({ title: "Living Sculpture OS" });
const params = {
    colorA: '#1a0029',
    colorB: '#ff0055',
    colorC: '#00ffcc',
    bloomStrength: 1.5,
    noiseSpeed: 0.2,
    autoRotate: true
};

// --- 3. BACKGROUND PARTICLES (Starfield) ---
const particlesGeometry = new THREE.BufferGeometry();
const particlesCount = 1500; // Fewer particles = clearer sky
const posArray = new Float32Array(particlesCount * 3);

for(let i = 0; i < particlesCount * 3; i++) {
    // Spread them very wide (40) so they appear distant
    posArray[i] = (Math.random() - 0.5) * 40; 
}

particlesGeometry.setAttribute('position', new THREE.BufferAttribute(posArray, 3));

const particlesMaterial = new THREE.PointsMaterial({
    size: 0.03,       // Small, sharp points
    color: 0xffffff,  // Pure White
    transparent: true,
    opacity: 0.9,     // Bright starsn 
    sizeAttenuation: true // Makes distant stars look smaller
});
                                                                   
const particlesMesh = new THREE.Points(particlesGeometry, particlesMaterial);
scene.add(particlesMesh);

// --- 4. AUDIO ---
let analyser, dataArray, isAudioActive = false;
const overlay = document.createElement('div');
overlay.style.cssText = 'position:absolute;top:0;left:0;width:100%;height:100%;display:flex;justify-content:center;align-items:center;background:radial-gradient(circle,rgba(10,10,10,0.8) 0%,rgba(0,0,0,1) 100%);color:white;font-family:monospace;font-size:24px;cursor:pointer;z-index:999;';
overlay.innerHTML = "[ CLICK TO AWAKEN ]";
document.body.appendChild(overlay);

overlay.addEventListener('click', async () => {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        const source = audioCtx.createMediaStreamSource(stream);
        analyser = audioCtx.createAnalyser();
        analyser.fftSize = 256;
        source.connect(analyser);
        dataArray = new Uint8Array(analyser.frequencyBinCount);
        isAudioActive = true;
        overlay.style.opacity = '0';
        setTimeout(() => overlay.remove(), 1000);
    } catch (err) {
        overlay.innerHTML = "AUDIO DENIED - VISUAL MODE";
        setTimeout(() => overlay.remove(), 2000);
    }
});

// --- 5. POST PROCESSING ---
const renderScene = new RenderPass(scene, camera);

const bloomPass = new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 1.5, 0.4, 0.85);
const rgbShiftPass = new ShaderPass(RGBShiftShader);
rgbShiftPass.uniforms['amount'].value = 0.0025;

const composer = new EffectComposer(renderer);
composer.addPass(renderScene);
composer.addPass(bloomPass);
composer.addPass(rgbShiftPass);

gui.add(params, 'bloomStrength', 0, 3).onChange(v => bloomPass.strength = v);
gui.add(rgbShiftPass.uniforms['amount'], 'value', 0, 0.01).name('Lens Distortion');
gui.add(params, 'autoRotate');

// --- 6. OBJECT ---
const geometry = new THREE.IcosahedronGeometry(1, 100);
const material = new THREE.ShaderMaterial({
  vertexShader,
  fragmentShader,
  uniforms: {
    uTime: { value: 0 },
    uNoiseStrength: { value: 0.2 },
    uNoiseSpeed: { value: 0.2 },
    uColorA: { value: new THREE.Color(params.colorA) }, 
    uColorB: { value: new THREE.Color(params.colorB) }, 
    uColorC: { value: new THREE.Color(params.colorC) }, 
    uHover: { value: 0 }
  }
});

gui.addColor(params, 'colorA').onChange(v => material.uniforms.uColorA.value.set(v));
gui.addColor(params, 'colorB').onChange(v => material.uniforms.uColorB.value.set(v));
gui.addColor(params, 'colorC').onChange(v => material.uniforms.uColorC.value.set(v));
gui.add(params, 'noiseSpeed', 0, 2);

const organism = new THREE.Mesh(geometry, material);
scene.add(organism);

// --- 7. ANIMATION ---
const clock = new THREE.Clock();
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2(9999, 9999);
let hoverValue = 0; 

function animate() {
  const elapsedTime = clock.getElapsedTime();
  controls.update();

  let audioStrength = 0;
  if (isAudioActive) {
      analyser.getByteFrequencyData(dataArray);
      let sum = 0;
      for(let i = 0; i < 20; i++) sum += dataArray[i];
      audioStrength = (sum / 20) / 255.0; 
  }

  raycaster.setFromCamera(mouse, camera);
  const intersects = raycaster.intersectObject(organism);
  const targetHover = intersects.length > 0 ? 1.0 : 0.0;
  hoverValue += (targetHover - hoverValue) * 0.1;

// D. Update Uniforms
  material.uniforms.uTime.value = elapsedTime;
  material.uniforms.uHover.value = hoverValue; 
  
  // REDUCED SPEED: Changed multiplier from * 2.0 to * 0.5
  // This keeps the pulse deep but slow, like a sleeping giant
  material.uniforms.uNoiseStrength.value = 0.2 + (audioStrength * 2.0); // Strength (size) stays big
  material.uniforms.uNoiseSpeed.value = params.noiseSpeed + (audioStrength * 0.5); // <--- SLOWER

  // E. Dynamic Bloom
  bloomPass.strength = params.bloomStrength + hoverValue * 1.5 + (audioStrength * 3.0);

  // F. Rotation
  if (params.autoRotate) {
      // REDUCED SPIN: Changed multiplier from * 0.1 to * 0.02
      // It will barely speed up, just a subtle drift
      const rotationSpeed = 0.005 + (audioStrength * 0.02); // <--- SLOWER
      organism.rotation.y += rotationSpeed;
      organism.rotation.z += rotationSpeed * 0.5;
  }
  
  if (audioStrength > 0.3) {
      organism.position.x = (Math.random() - 0.5) * audioStrength * 0.2;
      organism.position.y = (Math.random() - 0.5) * audioStrength * 0.2;
  } else {
      organism.position.x *= 0.9;
      organism.position.y *= 0.9;
  }

  particlesMesh.rotation.y = elapsedTime * 0.02;

  composer.render();
  requestAnimationFrame(animate);
}

animate();

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