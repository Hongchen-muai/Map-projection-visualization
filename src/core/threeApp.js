import * as THREE from 'three';
import gsap from 'gsap';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import * as topojson from 'topojson-client';

let scene, camera, renderer, controls;
let animationFrameId;

let earthGroup = new THREE.Group();     
let cylinderGroup = new THREE.Group();  
let glassCylinder;                      
let raysGroup = new THREE.Group();      

const R_EARTH = 5;      
const R_CYLINDER = 5.0; 

const createUnfoldMaterial = (colorHex) => {
  return new THREE.ShaderMaterial({
    uniforms: {
      uProject: { value: 0.0 },                     
      uUnfold: { value: 0.0 },                      
      uColor: { value: new THREE.Color(colorHex) }, 
      uOpacity: { value: 0.0 }                      
    },
    vertexShader: `
      uniform float uProject;
      uniform float uUnfold;
      attribute vec3 spherePos;
      
      void main() {
        vec3 cylPos = position;
        
        float angle = atan(cylPos.x, cylPos.z);
        float flatX = angle * ${R_CYLINDER.toFixed(1)};
        vec3 flatPos = vec3(flatX, cylPos.y, 0.0);
        
        vec3 stage1Pos = mix(spherePos, cylPos, uProject);
        vec3 finalPos = mix(stage1Pos, flatPos, uUnfold);
        
        gl_Position = projectionMatrix * modelViewMatrix * vec4(finalPos, 1.0);
      }
    `,
    fragmentShader: `
      uniform vec3 uColor;
      uniform float uOpacity;
      void main() {
        gl_FragColor = vec4(uColor, uOpacity);
      }
    `,
    transparent: true,
    depthWrite: false
  });
};

export function initScene(container) {
  scene = new THREE.Scene();
  
  camera = new THREE.PerspectiveCamera(45, container.clientWidth / container.clientHeight, 0.1, 1000);
  camera.position.set(0, 5, 25);

  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setSize(container.clientWidth, container.clientHeight);
  renderer.setPixelRatio(window.devicePixelRatio);
  container.appendChild(renderer.domElement);

  controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.05;

  scene.add(earthGroup);
  scene.add(cylinderGroup);
  scene.add(raysGroup);

  const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
  scene.add(ambientLight);
  const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
  dirLight.position.set(10, 20, 15);
  scene.add(dirLight);

  const sphereGeo = new THREE.SphereGeometry(R_EARTH * 0.98, 64, 64);
  const sphereMat = new THREE.MeshPhongMaterial({ 
    color: 0xfdfbf7, 
    transparent: true, 
    opacity: 0.9,
    shininess: 30
  });
  earthGroup.add(new THREE.Mesh(sphereGeo, sphereMat));

  loadGeoJSON();

  const resizeObserver = new ResizeObserver(() => onWindowResize(container));
  resizeObserver.observe(container);
  animate();
}

function lonLatToSphere(lon, lat, R) {
  const phi = lat * (Math.PI / 180);
  const lambda = lon * (Math.PI / 180);
  return new THREE.Vector3(
    R * Math.cos(phi) * Math.sin(lambda),
    R * Math.sin(phi),
    R * Math.cos(phi) * Math.cos(lambda)
  );
}

function lonLatToMercatorCylinder(lon, lat, R) {
  const lambda = lon * (Math.PI / 180);
  const clampedLat = Math.max(-85, Math.min(85, lat));
  const phi = clampedLat * (Math.PI / 180);
  const y = R * Math.log(Math.tan(Math.PI / 4 + phi / 2));
  return new THREE.Vector3(R * Math.sin(lambda), y, R * Math.cos(lambda));
}

function loadGeoJSON() {
  fetch('https://unpkg.com/world-atlas@2.0.2/land-110m.json')
    .then(res => res.json())
    .then(data => {
      const land = topojson.feature(data, data.objects.land);
      land.features.forEach(feature => {
        if (feature.geometry.type === 'Polygon') {
          drawRegion(feature.geometry.coordinates);
        } else if (feature.geometry.type === 'MultiPolygon') {
          feature.geometry.coordinates.forEach(poly => drawRegion(poly));
        }
      });
    });
}

function drawRegion(coordinates) {
  let spherePoints = [];
  let cylinderPoints = [];

  const flushLines = () => {
    if (spherePoints.length > 1) {
      const sphereGeo = new THREE.BufferGeometry().setFromPoints(spherePoints);
      const sphereMat = new THREE.LineBasicMaterial({ color: 0x000000, linewidth: 1 });
      earthGroup.add(new THREE.Line(sphereGeo, sphereMat));

      const cylinderGeo = new THREE.BufferGeometry().setFromPoints(cylinderPoints);
      const sphereCoords = new Float32Array(spherePoints.length * 3);
      spherePoints.forEach((p, i) => {
        sphereCoords[i*3] = p.x; sphereCoords[i*3+1] = p.y; sphereCoords[i*3+2] = p.z;
      });
      cylinderGeo.setAttribute('spherePos', new THREE.BufferAttribute(sphereCoords, 3));

      const cylMat = createUnfoldMaterial(0x2563eb); 
      const cylLine = new THREE.Line(cylinderGeo, cylMat);
      cylLine.visible = false; 
      cylLine.frustumCulled = false; // FINALLY FIXED RENDER CROPPING IN STEP 2
      cylinderGroup.add(cylLine);

      for (let i = 0; i < spherePoints.length; i += 15) {
        const cylP = cylinderPoints[i];
        const rayGeo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0,0,0), cylP]);
        const rayMat = new THREE.LineBasicMaterial({ color: 0x94a3b8, transparent: true, opacity: 0 });
        const rayLine = new THREE.Line(rayGeo, rayMat);
        
        const initScale = R_EARTH / cylP.length();
        rayLine.scale.set(initScale, initScale, initScale);
        rayLine.userData = { initScale: initScale };
        rayLine.frustumCulled = false;
        raysGroup.add(rayLine);
      }
    }
    spherePoints = [];
    cylinderPoints = [];
  };

  let prevLon = null;
  coordinates[0].forEach(coord => {
    const lon = coord[0];
    const lat = coord[1];
    if (prevLon !== null && Math.abs(lon - prevLon) > 90) flushLines();
    prevLon = lon;
    spherePoints.push(lonLatToSphere(lon, lat, R_EARTH));
    cylinderPoints.push(lonLatToMercatorCylinder(lon, lat, R_CYLINDER));
  });
  flushLines();
}

// MAKE STEPS REPEATABLE AND REVERSIBLE
export function step1_wrapCylinder() {
  if (!glassCylinder) {
    const geometry = new THREE.CylinderGeometry(R_CYLINDER * 1.01, R_CYLINDER * 1.01, 30, 64, 1, true);
    const material = new THREE.MeshPhongMaterial({
      color: 0x94a3b8, transparent: true, opacity: 0, side: THREE.DoubleSide, shininess: 100
    });
    glassCylinder = new THREE.Mesh(geometry, material);
    scene.add(glassCylinder);
  }
  
  // Revert states
  cylinderGroup.children.forEach(child => {
    if (child.material && child.material.uniforms) {
      gsap.to(child.material.uniforms.uUnfold, { value: 0.0, duration: 1.5, ease: "power2.inOut" });
      gsap.to(child.material.uniforms.uProject, { value: 0.0, duration: 1.5, ease: "power2.inOut" });
      gsap.to(child.material.uniforms.uOpacity, { value: 0.0, duration: 1.0 });
    }
  });

  raysGroup.children.forEach(ray => {
    gsap.to(ray.scale, { x: ray.userData.initScale, y: ray.userData.initScale, z: ray.userData.initScale, duration: 1.5 });
    gsap.to(ray.material, { opacity: 0, duration: 1.0 });
  });

  earthGroup.children.forEach(mesh => {
    if (mesh.material) gsap.to(mesh.material, { opacity: 0.9, duration: 1.5 });
  });

  gsap.to(camera.position, { x: 15, y: 10, z: 25, duration: 2, ease: "power2.out" });
  gsap.to(glassCylinder.material, { opacity: 0.15, duration: 1.5 });
}

export function step2_projectRays() {
  cylinderGroup.children.forEach(child => {
    if (child.material && child.material.uniforms) {
      child.visible = true;
      gsap.to(child.material.uniforms.uOpacity, { value: 1.0, duration: 0.5 });
      gsap.to(child.material.uniforms.uProject, { value: 1.0, duration: 2.5, ease: "power2.inOut" });
      gsap.to(child.material.uniforms.uUnfold, { value: 0.0, duration: 2.0, ease: "power2.inOut" });
    }
  });

  raysGroup.children.forEach(ray => {
    gsap.to(ray.material, { opacity: 0.4, duration: 0.5 });
    gsap.to(ray.scale, { x: 1, y: 1, z: 1, duration: 2.5, ease: "power2.inOut" });
  });

  earthGroup.children.forEach(mesh => {
    if (mesh.material) gsap.to(mesh.material, { opacity: 0.25, duration: 2.5 });
  });

  if (glassCylinder) gsap.to(glassCylinder.material, { opacity: 0.15, duration: 1.5 });
  gsap.to(camera.position, { x: 15, y: 10, z: 25, duration: 2, ease: "power2.out" });
}

export function step3_unfoldMap() {
  if (glassCylinder) gsap.to(glassCylinder.material, { opacity: 0, duration: 1 });
  raysGroup.children.forEach(ray => {
    gsap.to(ray.material, { opacity: 0, duration: 1 });
  });

  cylinderGroup.children.forEach(child => {
    if (child.material && child.material.uniforms) {
      gsap.to(child.material.uniforms.uUnfold, { value: 1.0, duration: 3, ease: "power2.inOut" });
      // fade out slowly to reveal purely the 2d map behind/below it
      gsap.to(child.material.uniforms.uOpacity, { value: 0.0, delay: 2.0, duration: 1.5 });
    }
  });
  
  gsap.to(camera.position, { x: 0, y: 0, z: 35, duration: 3, ease: "power2.inOut" });
}

export let onRotationChange = null;
export function setRotationCallback(cb) { onRotationChange = cb; }

let extUpdating = false;

// EXPOSE ROTATION SETTER FOR TWO-WAY BINDING
export function setGlobeRotation(lon, lat) {
  if (!camera || !controls) return;
  extUpdating = true;
  const radius = camera.position.distanceTo(controls.target);
  const phi = Math.PI/2 - lat * (Math.PI/180);
  const theta = -lon * (Math.PI/180);

  camera.position.set(
    radius * Math.sin(phi) * Math.sin(theta),
    radius * Math.cos(phi),
    radius * Math.sin(phi) * Math.cos(theta)
  );
  controls.update();

  requestAnimationFrame(() => { extUpdating = false; });
}

function animate() {
  animationFrameId = requestAnimationFrame(animate);
  if (controls) {
    controls.update();
    if (onRotationChange && !extUpdating) {
      let lon = -controls.getAzimuthalAngle() * 180 / Math.PI;
      let lat = (Math.PI / 2 - controls.getPolarAngle()) * 180 / Math.PI;
      onRotationChange({ lon, lat });
    }
  }
  renderer.render(scene, camera);
}

function onWindowResize(container) {
  if (!container) return;
  camera.aspect = container.clientWidth / container.clientHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(container.clientWidth, container.clientHeight);
}

export function destroyScene() {
  if (animationFrameId) cancelAnimationFrame(animationFrameId);
  if (renderer) renderer.dispose();
  if (controls) controls.dispose();
}
