import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

const container = document.getElementById("threeContainer");
const hero = document.querySelector(".hero");
const bodyContainer = document.getElementById("bodyContainer");

let wrapper;
let model;
let hasRevealed = false;

let isDragging = false;
let previousX = 0;
let velocity = 0;

const MAX_SPEED = 0.1;
const DRAG_SENSITIVITY = 0.009;
const FRICTION = 0.81;

const scene = new THREE.Scene();
scene.background = null;

const camera = new THREE.PerspectiveCamera(
  50,
  container.clientWidth / container.clientHeight,
  0.1,
  1000
);

const renderer = new THREE.WebGLRenderer({
  antialias: true,
  alpha: true,
  powerPreference: "high-performance"
});

renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
renderer.setSize(container.clientWidth, container.clientHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1;

container.appendChild(renderer.domElement);

scene.add(new THREE.AmbientLight(0xffffff, 0.8));

const mainLight = new THREE.DirectionalLight(0xffffff, 1.2);
mainLight.position.set(5, 8, 5);
scene.add(mainLight);

const loader = new GLTFLoader();

let nodes = [];
let hoveredNode = null;

const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

function updateMouse(event) {
  const rect = renderer.domElement.getBoundingClientRect();
  const clientX = event.touches ? event.touches[0].clientX : event.clientX;
  const clientY = event.touches ? event.touches[0].clientY : event.clientY;
  
  mouse.x = ((clientX - rect.left) / rect.width) * 2 - 1;
  mouse.y = -((clientY - rect.top) / rect.height) * 2 + 1;
}

renderer.domElement.addEventListener("mousemove", updateMouse);
renderer.domElement.addEventListener("touchstart", updateMouse, { passive: true });

renderer.domElement.addEventListener("click", handleInteraction);
renderer.domElement.addEventListener("touchend", (e) => {
    // Prevent interaction if it was a drag
    if(Math.abs(velocity) < 0.005) handleInteraction();
});

function handleInteraction() {
  if (!hoveredNode) return;
  const mapping = {
    "right-knee": "knee",
    "left-knee": "knee",
    "right-anklet": "ankle",
    "left-anklet": "ankle",
    "low-back": "low-back",
    "upper-back": "upper-back",
    "cervical-neck": "cervical-neck",
    "right-shoulder": "shoulder",
    "left-shoulder": "shoulder"
  };
  const page = mapping[hoveredNode.name];
  if (page) {
    window.location.href = `${page}.html`;
  }
}

loader.load("/Untitled.glb", (gltf) => {
  model = new THREE.Group();

  gltf.scene.traverse((child) => {
    if (child.isMesh) {
      child.geometry.computeVertexNormals();
      child.material = new THREE.MeshStandardMaterial({
        color: 0xd9d4d1,
        metalness: 0.1,
        roughness: 0.6
      });
      model.add(child);
    }
  });

  model.scale.set(1.75, 1.75, 1.75);

  const box = new THREE.Box3().setFromObject(model);
  const center = box.getCenter(new THREE.Vector3());
  const size = box.getSize(new THREE.Vector3()).length();

  wrapper = new THREE.Group();
  wrapper.position.copy(center);
  scene.add(wrapper);

  model.position.sub(center);
  wrapper.add(model);

  camera.position.set(
    center.x,
    center.y + size * 0.45,
    center.z + size * 1.05
  );

  camera.lookAt(center);

  const bodyParts = [
    { name: "low-back", position: new THREE.Vector3(0, 0.4, -0.32) },
    { name: "upper-back", position: new THREE.Vector3(0, 0.85, -0.33) },
    { name: "right-knee", position: new THREE.Vector3(0.26, -0.58, -0.1) },
    { name: "left-knee", position: new THREE.Vector3(-0.26, -0.58, -0.1) },
    { name: "right-anklet", position: new THREE.Vector3(0.355, -1.32, -0.18) },
    { name: "left-anklet", position: new THREE.Vector3(-0.35, -1.32, -0.18) },
    { name: "right-shoulder", position: new THREE.Vector3(0.33, 0.91, -0.139) },
    { name: "left-shoulder", position: new THREE.Vector3(-0.33, 0.91, -0.139) },
    { name: "cervical-neck", position: new THREE.Vector3(0, 1.17, -0.25) }
  ];

  bodyParts.forEach(part => {
    const geometry = new THREE.SphereGeometry(0.04, 32, 32);
    const material = new THREE.MeshStandardMaterial({
      color: 0xffc1c1,
      emissive: 0x000000,
      emissiveIntensity: 0
    });
    const sphere = new THREE.Mesh(geometry, material);
    sphere.position.copy(part.position);
    sphere.name = part.name;
    wrapper.add(sphere);
    nodes.push(sphere);
  });
});

// --- Unified Input Handling (Desktop & Mobile) ---

const startDragging = (clientX) => {
  isDragging = true;
  previousX = clientX;
};

const stopDragging = () => {
  isDragging = false;
};

const handleDragging = (clientX) => {
  if (!isDragging || !wrapper) return;
  const deltaX = clientX - previousX;
  previousX = clientX;
  velocity += deltaX * DRAG_SENSITIVITY;
  velocity = Math.max(-MAX_SPEED, Math.min(MAX_SPEED, velocity));
};

// Mouse Listeners
renderer.domElement.addEventListener("mousedown", (e) => startDragging(e.clientX));
window.addEventListener("mouseup", stopDragging);
renderer.domElement.addEventListener("mousemove", (e) => handleDragging(e.clientX));

// Touch Listeners
renderer.domElement.addEventListener("touchstart", (e) => startDragging(e.touches[0].clientX), { passive: true });
window.addEventListener("touchend", stopDragging);
renderer.domElement.addEventListener("touchmove", (e) => {
  if (isDragging) {
    e.preventDefault(); // Stop scrolling while interacting
    handleDragging(e.touches[0].clientX);
  }
}, { passive: false });


function updateNodes() {
  if (!nodes.length) return;

  raycaster.setFromCamera(mouse, camera);
  const intersects = raycaster.intersectObjects(nodes, false);

  if (intersects.length > 0) {
    if (hoveredNode && hoveredNode !== intersects[0].object) {
      hoveredNode.scale.set(1, 1, 1);
      hoveredNode.material.color.set(0xffc1c1);
      hoveredNode.material.emissiveIntensity = 0;
    }
    hoveredNode = intersects[0].object;
    hoveredNode.scale.set(1.2, 1.2, 1.2);
    hoveredNode.material.color.set(0xff4d4d);
    hoveredNode.material.emissive.set(0xff0000);
    hoveredNode.material.emissiveIntensity = 0.4;
    renderer.domElement.style.cursor = "pointer";
  } else {
    if (hoveredNode) {
      hoveredNode.scale.set(1, 1, 1);
      hoveredNode.material.color.set(0xffc1c1);
      hoveredNode.material.emissiveIntensity = 0;
      hoveredNode = null;
    }
    renderer.domElement.style.cursor = "default";
  }
}

function animate() {
  requestAnimationFrame(animate);
  if (!wrapper) return;
  if (Math.abs(velocity) > 0.0001) {
    wrapper.rotation.y += velocity;
    velocity *= FRICTION;
  }
  updateNodes();
  renderer.render(scene, camera);
}

animate();

function spinModel() {
  if (!wrapper) return;
  const duration = 1200;
  const startTime = performance.now();
  const startRotation = wrapper.rotation.y;

  function animateSpin(now) {
    const elapsed = now - startTime;
    const progress = Math.min(elapsed / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3);
    wrapper.rotation.y = startRotation + eased * Math.PI * 2;
    if (progress < 1) requestAnimationFrame(animateSpin);
  }

  requestAnimationFrame(animateSpin);
}

window.addEventListener("resize", () => {
  camera.aspect = container.clientWidth / container.clientHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(container.clientWidth, container.clientHeight);
});

window.addEventListener("scroll", () => {
  if (window.scrollY > 50 && !hasRevealed) {
    hasRevealed = true;
    hero.classList.add("grow");
    bodyContainer.classList.add("reveal");
    spinModel();
  }
});